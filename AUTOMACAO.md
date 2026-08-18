# Catálogo privado de escudos do NewsWall

Repositório privado para armazenar e atualizar os escudos licenciados usados no painel NewsWall.

## Configuração inicial

Em **Settings → Secrets and variables → Actions**, cadastre:

- `ESCUDOSWEB_USUARIO`
- `ESCUDOSWEB_SENHA`

Nunca escreva essas informações em arquivos do repositório.

## Atualização

A automação executa mensalmente e também pode ser iniciada em **Actions → Sincronizar escudos licenciados → Run workflow**.

Os pacotes consultados ficam em `config/pacotes.txt`. O processo baixa os pacotes pela sua conta, extrai as imagens, gera `catalogo.json` e salva somente as alterações.

Se o EscudosWeb solicitar CAPTCHA ou alterar a página de acesso, a execução será interrompida sem tentar contornar a proteção.
