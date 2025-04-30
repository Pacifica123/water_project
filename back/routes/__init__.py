# from .backend import backend
# from .frontend import frontend
from .api import api, set_socketio
# from .socket_handlers import register_socket_handlers


# def register_routes(app):
def register_routes(app, socketio=None):
    if socketio:
        set_socketio(socketio)
    # Debugging: Print registered endpoints
    print("Registered endpoints:")
    for rule in app.url_map.iter_rules():
        print(rule.endpoint)
    app.register_blueprint(api, url_prefix='/')
    # app.register_blueprint(backend, url_prefix='/')
    # app.register_blueprint(frontend, url_prefix='/')

