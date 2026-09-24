"""Migrations only run through an explicitly provided connection."""

from alembic import context

connection = context.config.attributes.get("connection")
if connection is None:
    raise RuntimeError("Use python -m app.persistence.migrate with an explicit project URL")
context.configure(connection=connection, transactional_ddl=True)
with context.begin_transaction():
    context.run_migrations()
