# Migração para PostgreSQL

A V6 funciona localmente com o `file-adapter` em `.runtime/`, para não exigir instalação adicional. Para produção pública com múltiplas instâncias, use PostgreSQL.

O arquivo `postgres-schema.sql` define a estrutura recomendada. A camada de API foi mantida estável (`/api/auth/*`, `/api/sync`, `/api/admin/editorial`), então a migração deve substituir apenas o armazenamento do servidor, sem reescrever a interface.

Antes da migração, faça `npm run backup`. Em produção, configure backups automáticos do banco, retenção, restauração testada e métricas.
