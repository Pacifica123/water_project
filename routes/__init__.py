from .backend import backend
from .frontend import frontend


def register_routes(app):
    # Debugging: Print registered endpoints
    print("Registered endpoints:")
    for rule in app.url_map.iter_rules():
        print(rule.endpoint)
    app.register_blueprint(backend, url_prefix='/api')
    app.register_blueprint(frontend, url_prefix='/')

