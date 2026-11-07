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

## Estado atual

Este repositório contém o front-end e dados fictícios para demonstrar a navegação. Não há integração de autenticação, banco, Storage, Pix ou processamento de IA. O QR Code e a chave Pix mostrados no checkout são explicitamente de demonstração; não devem ser usados para pagar. A impressão para PDF serve apenas para visualizar o formato. O Lovable deverá ligar o download real à aprovação e liberação feitas no servidor.

O documento [`PROMPT_BACKEND_RLS.md`](.lovable/PROMPT_BACKEND_RLS.md) contém o pedido pronto para enviar ao Lovable para implementar back-end, RLS, Storage, operações de pagamento e liberação. O plano PWA já está configurado para o shell estático; dados pessoais e comprovantes não são colocados no cache offline.
