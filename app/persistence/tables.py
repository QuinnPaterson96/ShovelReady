"""Relational identities and reference edges around validated immutable JSONB."""

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

metadata = sa.MetaData()
records = sa.Table(
    "records",
    metadata,
    sa.Column("kind", sa.Text, primary_key=True),
    sa.Column("record_id", sa.Text, primary_key=True),
    sa.Column("logical_id", sa.Text, nullable=False),
    sa.Column("payload", JSONB, nullable=False),
    sa.Column(
        "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
    ),
)
sa.Index("records_logical_identity", records.c.kind, records.c.logical_id)
references = sa.Table(
    "record_references",
    metadata,
    sa.Column("owner_kind", sa.Text, primary_key=True),
    sa.Column("owner_id", sa.Text, primary_key=True),
    sa.Column("target_kind", sa.Text, primary_key=True),
    sa.Column("target_id", sa.Text, primary_key=True),
    sa.ForeignKeyConstraint(["owner_kind", "owner_id"], ["records.kind", "records.record_id"]),
    sa.ForeignKeyConstraint(["target_kind", "target_id"], ["records.kind", "records.record_id"]),
)
