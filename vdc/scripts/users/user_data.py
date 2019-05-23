import shortuuid

import google
from google.cloud import storage
from googleapiclient.errors import HttpError
from table import Table
from base64 import b64decode
import re

from globals import v1, kube_client, gcloud_service
from secrets import get_secret
from hailjwt import JWTClient

shortuuid.set_alphabet("0123456789abcdefghijkmnopqrstuvwxyz")

SECRET_KEY = get_secret('jwt-secret-key', 'default', 'secret-key')
print(SECRET_KEY)
jwtclient = JWTClient(SECRET_KEY)


def create_service_id(username):
    return f'{username}-{shortuuid.uuid()[0:5]}'


def create_google_service_account(sa_name, google_project):
    return gcloud_service.projects().serviceAccounts().create(
        name=f'projects/{google_project}',
        body={
            "accountId": sa_name, "serviceAccount": {
                "displayName": "user"
            }
        }).execute()


def delete_google_service_account(gsa_email, google_project):
    return gcloud_service.projects().serviceAccounts().delete(
        name=f'projects/{google_project}'
        f'/serviceAccounts/{gsa_email}'
    ).execute()


def create_kube_service_acccount(username, namespace):
    return v1.create_namespaced_service_account(
        namespace=namespace,
        body=kube_client.V1ServiceAccount(
            api_version='v1',
            metadata=kube_client.V1ObjectMeta(
                name=username,
                annotations={
                    "type": "user"
                }
            )
        )
    )


def delete_kube_service_acccount(ksa_name, namespace):
    return v1.delete_namespaced_service_account(name=ksa_name,
                                                namespace=namespace, body={})


def store_gsa_key_in_kube(gsa_key_name, gsa_email, google_project, kube_namespace):
    key = gcloud_service.projects().serviceAccounts().keys().create(
        name=f'projects/{google_project}/serviceAccounts/{gsa_email}', body={}
    ).execute()

    key['privateKeyData'] = b64decode(key['privateKeyData']).decode("utf-8")

    return v1.create_namespaced_secret(
        namespace=kube_namespace,
        body=kube_client.V1Secret(
            api_version='v1',
            string_data=key,
            metadata=kube_client.V1ObjectMeta(
                name=gsa_key_name,
                annotations={
                    "type": "user",
                    "gsa_email": gsa_email
                }
            )
        )
    )


def delete_kube_secret(secret_name, kube_namespace):
    return v1.delete_namespaced_secret(secret_name, kube_namespace)


def create_user_kube_secret(user_data, kube_namespace):
    jwt = jwtclient.encode(user_data)

    return v1.create_namespaced_secret(
        namespace=kube_namespace,
        body=kube_client.V1Secret(
            api_version='v1',
            string_data={'jwt': jwt.decode('utf-8')},
            metadata=kube_client.V1ObjectMeta(
                name=user_data['jwt_secret_name'],
                annotations={
                    "type": "user",
                }
            )
        )
    )


def create_bucket(bucket_name, gsa_email):
    bucket = storage.Client().bucket(bucket_name)
    bucket.labels = {
        'type': 'user',
    }

    bucket.create()

    acl = bucket.acl
    acl.user(gsa_email).grant_owner()
    acl.save()

    return bucket

def create_kube_namespace(username):
    return v1.create_namespace(
        namespace=namespace,
        body=kube_client.V1Namespace(
            api_version='v1',
            metadata=kube_client.V1ObjectMeta(
                name=username,
                annotations={
                    "type": "user"
                }
            )
        )
    )

def create_rbac(namespace, sa_name):
    api = kube_client.RbacAuthorizationV1Api()

    rule_name = f"admin"
    api.create_namespaced_role(
        namespace=namespace,
        body=kube_client.V1Role(
            api_version='v1',
            metadata=kube_client.V1ObjectMeta(
                name=rule_name,
                annotations={
                    "type": "user"
                }
            ),
            rules = [
                kube_client.V1PolicyRule(
                    verbs=["*"]
                )
            ]
        )
    )

    api.create_namespaced_role_binding(
        namespace=namespace,
        body=kube_client.V1Role(
            api_version='v1',
            metadata=kube_client.V1ObjectMeta(
                name=f"{username}-role",
                annotations={
                    "type": "user"
                }
            ),
            role_ref=kube_client.V1RoleRef(
                api_group="",
                kind="Role",
                name=rule_name
            )
        )
    )
    # ---
    # kind: Role
    # apiVersion: rbac.authorization.k8s.io/v1
    # metadata:
    # namespace: default
    # name: create-services-and-pods
    # rules:
    # - apiGroups: [""]
    # resources: ["services"]
    # verbs: ["*"]
    # - apiGroups: [""]
    # resources: ["pods"]
    # verbs: ["*"]
    # ---
    # kind: RoleBinding
    # apiVersion: rbac.authorization.k8s.io/v1
    # metadata:
    # namespace: default
    # name: notebook-create-services-and-pods
    # subjects:
    # - kind: ServiceAccount
    # name: notebook
    # namespace: default
    # roleRef:
    # kind: Role
    # name: create-services-and-pods
    # apiGroup: ""
    # ---

def delete_bucket(bucket_name):
    return storage.Client().get_bucket(bucket_name).delete()


def create_all(username, google_project, kube_namespace, is_developer = 0, is_service_account = 0):
    out = {}
    random_str = shortuuid.uuid()[0:5]

    sa_name = f'{username}-{random_str}'

    if is_developer == 1:
        out['developer'] = 1
        
        namespace_response = create_kube_namespace(username)
        namespace_name = namespace_response.metadata.name
        ksa_response = create_kube_service_acccount(username, kube_namespace)
        out['ksa_name'] = ksa_response.metadata.name

        create_rbac(namespace_name, out['ksa_name'])
    else:
        username = sa_name
    
    out['username'] = username

    if is_service_account == 1:
        out['service_account'] = 1

    gs_response = create_google_service_account(username, google_project)
    out['gsa_email'] = gs_response['email']

    bucket_name = f'hail-{username}-{random_str}'
    create_bucket(bucket_name, out['gsa_email'])
    out['bucket_name'] = bucket_name
    
    gsa_key_secret_name = f"{username}-gsa-key"
    ksa_secret_resp = store_gsa_key_in_kube(gsa_key_secret_name, out['gsa_email'],
                                            google_project, kube_namespace)
    out['gsa_key_secret_name'] = gsa_key_secret_name

    return out


def delete_all(user_obj, google_project='hail-vdc', kube_namespace='default'):
    modified = 0

    try:
        delete_bucket(user_obj['bucket_name'])
        modified += 1
    except google.api_core.exceptions.NotFound:
        pass

    try:
        delete_google_service_account(user_obj['gsa_email'], google_project)
        modified += 1
    except HttpError as e:
        if e.resp.status != 404:
            raise e

    try:
        delete_kube_service_acccount(user_obj['ksa_name'], kube_namespace)
        modified += 1
    except kube_client.rest.ApiException as e:
        if e.status != 404:
            raise e

    try:
        delete_kube_secret(user_obj['gsa_key_secret_name'], kube_namespace)
        delete_kube_secret(user_obj['jwt_secret_name'], kube_namespace)
        modified += 1
    except kube_client.rest.ApiException as e:
        if e.status != 404:
            raise e

    if modified == 0:
        return 404

def email_to_username(email):
    username = email.split('@')[0]
    username = re.sub('^[^0-9a-zA-Z]', '', username)
    username = re.sub('[^0-9a-zA-Z\-]+', '', username)

    if len(username) > 15:
        username = username[:15]

    return username

def create_all_idempotent(username, google_project='hail-vdc', kube_namespace='default', is_developer=0,is_service_account=0):
    table = Table()
    existing = table.get(username)

    if existing is None:
        username = email_to_username(email)
    
        user = create_all(username, google_project, kube_namespace)
        user['jwt_secret_name'] = f'{username}-jwt'
        
        table.insert(user_id, **user)
        res = table.get(user_id)
        user['id'] = res['id']

        ksa_secret_resp = create_user_kube_secret(user, kube_namespace)
    
        return res

    else:
        return existing


def delete_all_idempotent(user_id, google_project='hail-vdc',
                          kube_namespace='default'):
    table = Table()
    existing = table.get(user_id)

    if existing is None:
        return 404

    delete_all(existing, google_project, kube_namespace)
    table.delete(user_id)


if __name__ == "__main__":
    import sys
    import json

    if len(sys.argv) == 1:
        sys.exit(
            f"\nUsage: {sys.argv[0]} email is_developer is_service_account create|delete <kube_namespace> ")

    email = sys.argv[1]
    is_developer = int(sys.argv[2])
    is_service_account = int(sys.argv[3])
    op = sys.argv[4]
    kube_namespace = sys.argv[5]

    if op == 'create':
        print(json.dumps((create_all_idempotent(email, 'hail-vdc',
                                                kube_namespace, is_developer, is_service_account))))
    elif op == 'delete':
        error = delete_all_idempotent(email, 'hail-vdc', kube_namespace)

        if error == 404:
            print(f"\nNothing to change for {email}\n")
        else:
            print(f"\nSuccessfully deleted {email}\n")
    else:
        print(f"Unknown operation {op}")
