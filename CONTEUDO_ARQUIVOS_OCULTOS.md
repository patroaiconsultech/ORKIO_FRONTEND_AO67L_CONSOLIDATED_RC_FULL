# Conteúdo integral dos arquivos ocultos — para criação via interface web

Este documento existe para uma finalidade específica: permitir que os sete arquivos ocultos do frontend sejam criados diretamente na interface web do GitHub, por cópia e cola, sem depender de upload por arraste — que é justamente o mecanismo que os fez desaparecer na primeira vez.

O procedimento para cada arquivo é o mesmo. No repositório `patroaiconsultech/Plataforma-Efata-777-Frontend`, use **Add file → Create new file**. No campo de nome, digite o caminho completo exatamente como indicado no título de cada seção, incluindo o ponto inicial. Cole o conteúdo no corpo e confirme o commit.

Para os arquivos dentro de `.github/workflows/`, basta digitar o caminho completo com barras — o GitHub cria os diretórios automaticamente ao reconhecer o separador.

## 1. `.nvmrc`

Fixa a versão do Node exigida pelo projeto. O script de materialização do lockfile verifica esta versão e recusa executar se houver divergência.

```
20.20.2
```

## 2. `.npmrc`

Define o registry oficial e desabilita comportamentos que introduziriam variação entre instalações. O `save-exact=true` é o que garante versões fixas, e `package-lock=true` impede que o lockfile seja ignorado.

```
registry=https://registry.npmjs.org/
audit=false
fund=false
save-exact=true
package-lock=true
```

## 3. `.gitignore`

Impede que artefatos de build, dependências e segredos sejam versionados. A linha `!.env.example` é uma exceção deliberada: exclui todos os `.env.*` mas preserva o arquivo de exemplo, que deve ser versionado por não conter valores reais.

```
node_modules/
dist/
.env
.env.*
!.env.example
npm-debug.log*
.DS_Store
coverage/
build-evidence/
*.local
```

## 4. `.env.example`

Documenta as três variáveis que o frontend espera, com valores de desenvolvimento local. Serve como referência, não como configuração ativa.

```
VITE_API_BASE_URL=http://localhost:8080
VITE_STREAM_TIMEOUT_MS=300000
ORKIO_CSP_CONNECT_SRC=http://localhost:8080
```

Observação relevante para produção: o `ORKIO_CSP_CONNECT_SRC` alimenta a diretiva `connect-src` da política de segurança de conteúdo. Se a origem do backend não constar ali, o navegador bloqueia as chamadas de API silenciosamente, com erro visível apenas no console. No Railway, essa variável precisa apontar para o domínio real do backend.

## 5. `.github/CODEOWNERS`

Define revisores obrigatórios por caminho. Conteúdo idêntico ao original da Alpha 2.2.

```
# ORKIO Frontend Alpha 2.2 - Code Owners
# Build-critical files require explicit review

/package.json          @patroaiconsultech
/package-lock.json     @patroaiconsultech
/Dockerfile            @patroaiconsultech
/server.mjs            @patroaiconsultech
/scripts/              @patroaiconsultech
/.github/              @patroaiconsultech
/src/pwa/              @patroaiconsultech
/src/security/         @patroaiconsultech
```

## 6. `.github/workflows/00-materialize-lockfile.yml`

Workflow de materialização do lockfile, acionado manualmente. Reproduz em ambiente controlado o mesmo procedimento que executei localmente, com as travas de versão de Node e npm.

Este arquivo tem 1848 bytes. Por ser extenso e sensível a indentação — YAML quebra silenciosamente com espaçamento incorreto —, recomendo obtê-lo do ZIP anexado em vez de copiar daqui. Se optar por copiar, preserve a indentação exata.

## 7. `.github/workflows/01-verify-build.yml`

Workflow de verificação de build, acionado em push e pull request. É o arquivo mais importante do conjunto em termos de prevenção: ele executa `npm ci`, a suíte de testes, o build Vite e o `verify:dist` em cada alteração.

Com ele ativo, um commit sem `package-lock.json` passa a falhar no CI **antes** de chegar ao deploy. É a garantia estrutural de que a falha original não se repita. Mesma ressalva sobre indentação YAML: prefira extrair do ZIP.

## Alternativa que dispensa cópia manual

Os dois arquivos de workflow, por serem YAML, são os mais propensos a corrupção por cópia. Se preferir evitar o risco, existe um caminho intermediário: faça o upload apenas do `package-lock.json` e do `LOCKFILE_SHA256SUMS.txt` por arraste, crie os cinco arquivos pequenos por cópia e cola seguindo as seções acima, e deixe os dois workflows para um segundo momento.

O build de produção funciona sem os workflows — eles são verificação automática, não requisito de build. O que é **indispensável** para o Docker parar de falhar é o trio `package.json`, `package-lock.json` e `.npmrc`, referenciado na linha 3 do Dockerfile.

## Verificação após o upload

Depois de enviar os arquivos, confirme na árvore do repositório que os sete ocultos aparecem. O GitHub exibe arquivos ocultos na listagem normalmente — o que ele não faz é aceitá-los em upload por arraste. Se algum não aparecer, foi omitido e precisa ser criado individualmente.

Um teste rápido e definitivo: o repositório já contém `SHA256SUMS.txt` versionado. Após o upload, clonando o repositório e rodando `sha256sum -c SHA256SUMS.txt`, o resultado deve ser **64 de 64 arquivos OK**. Antes destes patches, eram 57 de 64.
