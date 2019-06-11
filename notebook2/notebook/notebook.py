from hailjwt import JWTClient, get_domain
from table import Table
import jwt
from cryptography import fernet
import base64
# import hashlib
# import uuid
# import requests
import logging
# from functools import wraps
# from urllib.parse import urlencode
# from authlib.client import aiohttp as aioauth
import sass

import aiohttp
from aiohttp import web
import aiohttp_jinja2
import jinja2

from aiohttp_session import setup, get_session
from aiohttp_session.cookie_storage import EncryptedCookieStorage
import uvloop
import os
import secrets
# import kubeclient

uvloop.install()

fmt = logging.Formatter(
    # NB: no space after levelname because WARNING is so long
    '%(levelname)s\t| %(asctime)s \t| %(filename)s \t| %(funcName)s:%(lineno)d | '
    '%(message)s')

fh = logging.FileHandler('notebook2.log')
fh.setLevel(logging.INFO)
fh.setFormatter(fmt)

ch = logging.StreamHandler()
ch.setLevel(logging.INFO)
ch.setFormatter(fmt)

log = logging.getLogger('notebook2')
log.setLevel(logging.INFO)
logging.basicConfig(
    handlers=[fh, ch],
    level=logging.INFO)
scss_path = 'static/styles'
css_path = f'{scss_path}/css'
os.makedirs(css_path, exist_ok=True)
sass.compile(dirname=(scss_path, css_path), output_style='compressed')


def read_string(f):
    with open(f, 'r') as f:
        return f.read().strip()


AUTHORIZED_USERS = read_string('/notebook-secrets/authorized-users').split(',')
AUTHORIZED_USERS = dict((email, True) for email in AUTHORIZED_USERS)

PASSWORD = read_string('/notebook-secrets/password')
ADMIN_PASSWORD = read_string('/notebook-secrets/admin-password')


SERVER_PORT = 5000

USE_SECURE_COOKIE = os.environ.get("NOTEBOOK_DEBUG") != "1"
# app.config.update(
#     SECRET_KEY=secrets.token_bytes(16),
#     SESSION_COOKIE_SAMESITE='Lax',
#     SESSION_COOKIE_HTTPONLY=True,
#     SESSION_COOKIE_SECURE=USE_SECURE_COOKIE
# )

AUTH0_CLIENT_ID = 'Ck5wxfo1BfBTVbusBeeBOXHp3a7Z6fvZ'
AUTH0_BASE_URL = 'https://hail.auth0.com'
client_secret = read_string('/notebook-secrets/auth0-client-secret')
payload = f"grant_type=client_credentials&client_id={AUTH0_CLIENT_ID}&client_secret={client_secret}&audience=hail"
url = "https://hail.auth0.com/authorize?response_type=code&client_id=Ck5wxfo1BfBTVbusBeeBOXHp3a7Z6fvZ&redirect_uri=http://notebook2.hail.local/auth0-callback&scope='openid email profile'&state={}"

# client = OAuth2Client(
#     client_id='AUTH0_CLIENT_ID',
#     client_secret=read_string('/notebook-secrets/auth0-client-secret'),
#     api_base_url=AUTH0_BASE_URL,
#     access_token_url=f'{AUTH0_BASE_URL}/oauth/token',
#     authorize_url=f'{AUTH0_BASE_URL}/authorize',
#     client_kwargs={
#         'scope': 'openid email profile',
#     },
# )

# auth0 = oauth.register(
#     'auth0',
#     client_id=AUTH0_CLIENT_ID,
#     client_secret=read_string('/notebook-secrets/auth0-client-secret'),
#     api_base_url=AUTH0_BASE_URL,
#     access_token_url=f'{AUTH0_BASE_URL}/oauth/token',
#     authorize_url=f'{AUTH0_BASE_URL}/authorize',
# client_kwargs={
#     'scope': 'openid email profile',
# },
# )

user_table = Table()

with open('/jwt-secret-key/secret-key', 'rb') as f:
    jwtclient = JWTClient(f.read())


def jwt_decode(token):
    if token is None:
        return None

    try:
        return jwtclient.decode(token)
    except jwt.exceptions.InvalidTokenError as e:
        log.warn(f'found invalid token {e}')
        return None


def external_url_for(request, path):
    # NOTE: nginx strips https and sets X-Forwarded-Proto: https, but
    # it is not used by request.url or url_for, so rewrite the url and
    # set _scheme='https' explicitly.
    protocol = request.headers.get('X-Forwarded-Proto', None)

    return request.url(path=path, scheme=protocol)
    return url + path

# def attach_user():
#     def attach_user(f):
#         @wraps(f)
#         def decorated(*args, **kwargs):
#             g.user = jwt_decode(request.cookies.get('user'))

#             return f(*args, **kwargs)

#         return decorated
#     return attach_user


# def requires_auth(for_page=True):
#     def auth(f):
#         @wraps(f)
#         def decorated(*args, **kwargs):
#             g.user = jwt_decode(request.cookies.get('user'))

#             if g.user is None:
#                 if for_page:
#                     session['referrer'] = request.url
#                     return redirect(external_url_for('login'))

#                 return '', 401

#             return f(*args, **kwargs)

#         return decorated
#     return auth


def handler(request):
    return {'name': 'Andrew', 'surname': 'Svetlov'}


routes = web.RouteTableDef()


@routes.get('/')
@aiohttp_jinja2.template('index.html')
async def hello(request):
    session = await get_session(request)
    return {'session': session, 'user': None}


@routes.get('/login')
async def login_auth0(request):
    session = await get_session(request)
    print(session)
    token = secrets.token_urlsafe(64)
    session['csrf_token'] = token
    print("SET SESSION", session['csrf_token'])
    return web.HTTPFound(url.format(token))
    # return auth0.authorize_redirect(redirect_uri=external_url_for('auth0-callback'),
                                    # audience = f'{AUTH0_BASE_URL}/userinfo', prompt = 'login')


# https://hail.auth0.com/authorize?response_type=code&client_id=Ck5wxfo1BfBTVbusBeeBOXHp3a7Z6fvZ&redirect_uri=http://notebook2.hail.local/auth0-callback&scope=%27openid%20email%20profile%27&state=XfQPMTPjX56-9QKT0JzuuFH7rZ-sgvwyVXoDACJgjmZSnt_n5Fo-oJbF6Sce1_xttxY9J57SpEiW1aKHFB8EDQ
@routes.get('/auth0-callback')
async def auth0_callback(request):
    session = await get_session(request)
    print("SESSION", session)
    csrf_token = session['csrf_token']

    response_type = request.rel_url.query['response_type']
    redirect_uri = request.rel_url.query['redirect_uri']
    client_id = request.rel_url.query['client_id']
    auth_code = request.rel_url.query['code']
    csrf_state = request.rel_url.query['state']

    print(response_type, redirect_uri, client_id, auth_code, csrf_state)

    del session['csrf_token']

    if csrf_token != csrf_state:
        raise aiohttp.web.HTTPUnauthorized()

    

    # return  aiohttp.web.HTTPFound(url)
    # return auth0.authorize_redirect(redirect_uri=external_url_for('auth0-callback'),
                                    # audience = f'{AUTH0_BASE_URL}/userinfo', prompt = 'login')



# @routes.get('/auth0-callback')
# def auth0_callback():
#     auth0.authorize_access_token()

#     userinfo=auth0.get('userinfo').json()

#     email=userinfo['email']

#     if AUTHORIZED_USERS.get(email) is None:
#         return redirect(external_url_for(f"error?err=Unauthorized"))

#     g.user={
#         'auth0_id': userinfo['sub'],
#         'name': userinfo['name'],
#         'email': email,
#         'picture': userinfo['picture'],
#         **user_table.get(userinfo['sub'])
#     }

#     if 'referrer' in session:
#         redir = redirect(session['referrer'])
#         del session['referrer']
#     else:
#         redir = redirect('/')

#     print("user", g.user)

#     response = flask.make_response(redir)
#     response.set_cookie('user', jwtclient.encode(g.user), domain=get_domain(
#         request.host), secure=USE_SECURE_COOKIE, httponly=True, samesite='Lax')

#     return response


if __name__ == '__main__':
    app = web.Application()

    # secret_key must be 32 url-safe base64-encoded bytes
    fernet_key = fernet.Fernet.generate_key()
    secret_key = base64.urlsafe_b64decode(fernet_key)
    setup(app, EncryptedCookieStorage(secret_key))

    routes.static('/static', 'notebook/static')
    app.add_routes(routes)

    # oauth = OAu(app)
    # github = oauth.register('github', {...})

    aiohttp_jinja2.setup(app,
                         loader=jinja2.FileSystemLoader('./notebook/templates'))

    web.run_app(app, port=SERVER_PORT)
