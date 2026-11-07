# Próxima Página

Front-end de uma experiência para criar currículos, escolher entre três planos e administrar modelos e pedidos.

## Rodar localmente

```sh
npm install
npm run dev
```

Tecnologias: React, TypeScript, Vite, Lucide e `vite-plugin-pwa`.

## Rotas

- `/` — apresentação, formulário do candidato, galeria com 20 modelos demonstrativos por plano e etapa de checkout de prévia.
- `/admin` — painel responsivo de demonstração para visão geral, pedidos, modelos, planos/Pix e configurações.

## Integrações

- Planos, modelos, checkout e status do pedido usam o cliente Supabase e as RPCs do schema gerado.
- O admin exige autenticação e valida o papel `admin`; aprovação do Pix e liberação do PDF chamam RPCs independentes.
- Formulário, planos/modelos e listagem mínima de pedidos têm cache local para fallback offline. Escritas administrativas ficam bloqueadas sem conexão.
- O QR Code é obtido pelo caminho configurado no checkout; o bucket `pix-qr-codes` precisa permitir URL assinada para esse usuário.
- O PDF é criado no navegador por `html2canvas` + `jsPDF`, somente depois de o status remoto confirmar `approved` e `download_released`.
- A galeria local é usada como fallback quando não há modelos ativos publicados no Supabase. A importação de templates ainda precisa de um fluxo de Storage e cadastro administrativo.
- A criação do primeiro usuário administrador, as policies RLS e a configuração dos buckets devem estar prontas no Supabase antes da publicação.

O PWA cacheia o shell da aplicação. Dados pessoais do candidato, comprovantes e PDFs não são incluídos no cache do service worker.
