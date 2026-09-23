# ADR 003: Cookie session verification

Middleware only checks cookie presence. Node-runtime server code verifies short-lived JWTs and revalidates the active farm membership on every protected operation.
