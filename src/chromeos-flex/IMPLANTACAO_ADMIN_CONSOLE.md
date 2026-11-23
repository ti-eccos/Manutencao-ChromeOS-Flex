# Implantação da extensão ECCOS com GitHub Pages

Este fluxo não usa cadastro de desenvolvedor nem publicação na Chrome Web Store. O Admin Console instala a extensão hospedada pelo colégio por meio de uma URL personalizada.

## Requisitos

- Repositório GitHub público para usar GitHub Pages sem contratar outro plano. O código da extensão e o pacote assinado ficarão publicamente baixáveis; a instalação e o acesso às APIs corporativas continuam controlados pelas políticas escolares.
- GitHub Pages habilitado para `ti-eccos/Manutencao-ChromeOS-Flex` e publicado a partir de `main`.
- Endereço do site: `https://ti-eccos.github.io/Manutencao-ChromeOS-Flex/`.
- Conta com permissão de administrador no Google Admin Console.

O Pages tem limites de uso documentados (site até 1 GB e limite flexível de banda de 100 GB/mês). Para este pacote pequeno e downloads de atualização, a expectativa é de uso baixo. Se o limite for atingido, o GitHub pode limitar ou deixar de servir o site; a documentação não descreve cobrança automática por exceder o limite do Pages.

## 1. Preparar os arquivos do site

1. O repositório `ti-eccos/Manutencao-ChromeOS-Flex` está público e vazio, então o site pode ser publicado gratuitamente por branch.
2. Habilite **Settings > Pages > Deploy from a branch > main > /docs**.
3. O endereço do site será `https://ti-eccos.github.io/Manutencao-ChromeOS-Flex/`.
4. O `manifest.json` já aponta as atualizações para `https://ti-eccos.github.io/Manutencao-ChromeOS-Flex/chromeos-flex/updates.xml`.

## 2. Assinar o pacote

1. No Chrome do computador de preparação, abra `chrome://extensions` e habilite **Modo do desenvolvedor**.
2. Selecione **Compactar extensão** e escolha a pasta da extensão ECCOS.
3. Na primeira compactação, o Chrome criará um arquivo `.crx` e uma chave privada `.pem`. Guarde o `.pem` sob custódia da equipe de tecnologia, com cópia de segurança controlada. **Nunca envie o `.pem` ao GitHub, ao pen drive de distribuição ou ao repositório.**
4. Anote o ID de 32 caracteres mostrado em `chrome://extensions`.
5. Reassine o `.crx` gerado pelo Chrome com o helper `Ferramentas/assinar-crx3.js`, usando a mesma chave `.pem` e o ID anotado. O helper gera a prova RSA-SHA256 exigida no CRX3.
6. Copie o CRX resultante para `docs/chromeos-flex/Kit_ECCOS_ChromeOS_Flex.crx`.

O endereço do repositório deve ser fixado antes da primeira assinatura/publicação. Para atualizações, aumente a versão no `manifest.json`, compacte usando a mesma chave `.pem` e atualize o XML. Uma nova chave cria outro ID e interrompe a continuidade das atualizações.

## 3. Criar o manifesto de atualização

Crie `docs/chromeos-flex/updates.xml` usando o ID gerado pela chave de assinatura:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<gupdate xmlns="http://www.google.com/update2/response" protocol="2.0">
  <app appid="ID_DA_EXTENSAO">
    <updatecheck codebase="https://ti-eccos.github.io/Manutencao-ChromeOS-Flex/chromeos-flex/Kit_ECCOS_ChromeOS_Flex.crx" version="0.2.5" />
  </app>
</gupdate>
```

Publique `updates.xml` e o `.crx` no Pages. A URL do XML precisa abrir diretamente, sem tela de login nem redirecionamento para uma página de visualização.

## 4. Instalar pela política escolar

1. Entre no Google Admin Console e abra **Dispositivos > Chrome > Apps e extensões > Usuários e navegadores**.
2. Selecione a unidade organizacional exclusiva da equipe de tecnologia.
3. Escolha **Adicionar > Adicionar app ou extensão do Chrome pelo ID**.
4. Informe o ID da extensão, selecione **De um URL personalizado** e informe `https://ti-eccos.github.io/Manutencao-ChromeOS-Flex/chromeos-flex/updates.xml`.
5. Na política de instalação, escolha **Forçar instalação** e salve.
6. Na unidade organizacional dos dispositivos, habilite **Enterprise Hardware Platform API** em **Dispositivos > Chrome > Configurações > Dispositivo** para disponibilizar fabricante e modelo.
7. Confirme que os dispositivos Flex estão inscritos no gerenciamento escolar e que os técnicos entram com contas gerenciadas e afiliadas.

## 5. Confirmar e atualizar

- Aguarde a sincronização da política nos notebooks e confirme que a extensão aparece no Chrome.
- Clique no ícone da extensão para abrir o inventário em uma guia própria. Confira os dados disponibilizados, gere um relatório de teste e guarde-o no pen drive autorizado.
- Para cada atualização: incremente `version`, compacte novamente com o mesmo `.pem`, substitua o `.crx`, atualize a versão no `updates.xml` e publique as mudanças no Pages.
- Depois de publicar, use a opção de atualizar extensões em `chrome://extensions` durante a validação ou aguarde a checagem automática.

## Privacidade e limitações

- O repositório e os arquivos servidos pelo Pages são públicos no plano GitHub Free. Isso expõe o código e o instalador, não os inventários: os relatórios são gerados localmente e a extensão não os envia ao site.
- Nunca publique a chave `.pem`, relatórios de inventário, número de série de equipamentos ou credenciais.
- Não valide o pacote abrindo o link `.crx` diretamente. A instalação deve ocorrer pela política gerenciada configurada no Admin Console.
- A política do Admin Console restringe a instalação gerenciada à unidade organizacional da equipe; APIs corporativas exigem instalação por política.
- Valide após a primeira publicação que o Pages serve o `.crx` com tipo MIME `application/x-chrome-extension` e que a URL do XML retorna o arquivo diretamente.
- Saúde da bateria, SMART e alguns dados de espaço livre não são expostos em todas as versões do ChromeOS.
