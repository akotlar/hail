import os
import logging
from functools import wraps
from aiohttp import web
import jwt

log = logging.getLogger('hailjwt')


class JWTClient:
    __ALGORITHM = 'HS256'

    @staticmethod
    def generate_key():
        import secrets
        return secrets.token_bytes(64)

    @staticmethod
    def unsafe_decode(token):
        return jwt.decode(token, verify=False)

    @staticmethod
    def _verify_key_preqrequisites(secret_key):
        if len(secret_key) < 32:
            raise ValueError(
                f'found secret key with {len(secret_key)} bytes, but secret '
                f'key must have at least 32 bytes (i.e. 256 bits)')

    def __init__(self, secret_key):
        assert isinstance(secret_key, bytes)
        JWTClient._verify_key_preqrequisites(secret_key)
        self.secret_key = secret_key

    def decode(self, token):
        return jwt.decode(
            token, self.secret_key, algorithms=[JWTClient.__ALGORITHM])

    def encode(self, payload):
        return (jwt.encode(
            payload, self.secret_key, algorithm=JWTClient.__ALGORITHM)
                .decode('ascii'))


def get_domain(host):
    parts = host.split('.')
    return f"{parts[-2]}.{parts[-1]}"


jwtclient = None


def authenticated_users_only(fun):
    global jwtclient

    if not jwtclient:
        with open(os.environ.get('HAIL_JWT_SECRET_KEY_FILE',
                                 '/jwt-secret-key/secret-key'), 'rb') as f:
            jwtclient = JWTClient(f.read())

    @wraps(fun)
    def wrapped(request, *args, **kwargs):
        encoded_token = request.cookies.get('user')
        if encoded_token is not None:
            try:
                userdata = jwtclient.decode(encoded_token)
                return fun(request, userdata, *args, **kwargs)
            except jwt.exceptions.InvalidTokenError as exc:
                log.info(f'could not decode token: {exc}')
        raise web.HTTPUnauthorized(headers={'WWW-Authenticate': 'Bearer'})
    return wrapped


def authenticated_developers_only(fun):
    @authenticated_users_only
    @wraps(fun)
    def wrapped(request, userdata, *args, **kwargs):
        if ('developer' in userdata) and userdata['developer'] is 1:
            return fun(request, *args, **kwargs)
        raise web.HTTPNotFound()
    return wrapped