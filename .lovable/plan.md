# Painel de gestão instalável no celular

## O que você vai ter
- Instalar o painel no celular ou no computador ("Adicionar à tela inicial").
- Um ícone próprio "CV Admin". Ao tocar nele, o painel abre direto em /admin, em tela cheia e sem a barra do navegador.
- O login e as regras de acesso continuam iguais: só a sua conta de administrador entra.

## O que não muda
- O painel continua precisando de internet, porque os currículos e os comprovantes ficam na nuvem.
- O site dos clientes continua igual.

## Como instalar (depois de publicar)
- Android (Chrome): abra o site publicado em /admin, toque no menu e escolha "Instalar app" ou "Adicionar à tela inicial".
- iPhone (Safari): abra /admin, toque em Compartilhar e escolha "Adicionar à Tela de Início".
- A instalação funciona só no site publicado, não na pré-visualização.

## Detalhes técnicos
- Criar `public/manifest.webmanifest` com name "CV Profissional Admin", short_name "CV Admin", start_url "/admin", scope "/", display "standalone", theme_color e background_color tirados do tema do site.
- Gerar os ícones 192, 512 e 512 maskable, além do apple-touch-icon 180, em `public/`.
- Adicionar ao `index.html` as tags manifest, theme-color, apple-touch-icon e apple-mobile-web-app-capable.
- Não usar service worker nem modo offline: a instalação precisa apenas do manifesto.
