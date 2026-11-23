# Kit ECCOS · ChromeOS Flex

Extensão de inventário automático para os notebooks com ChromeOS Flex usados pela equipe de tecnologia do Colégio ECCOS.

## Distribuição

O pacote é hospedado pelo GitHub Pages e instalado por URL personalizada no Google Admin Console. A extensão não usa Chrome Web Store nem requer cadastro pago de desenvolvedor.

- Site do Pages: https://ti-eccos.github.io/Manutencao-ChromeOS-Flex/
- Manifesto de atualização: https://ti-eccos.github.io/Manutencao-ChromeOS-Flex/chromeos-flex/updates.xml
- Pacote CRX: https://ti-eccos.github.io/Manutencao-ChromeOS-Flex/chromeos-flex/Kit_ECCOS_ChromeOS_Flex.crx
- Fonte da extensão: `src/chromeos-flex/`

## Ativar o Pages

No repositório, abra **Settings > Pages**, escolha **Deploy from a branch**, selecione a branch `main` e a pasta `/docs`. Aguarde a publicação do site.

## Instalar pela política da escola

No Admin Console, abra **Dispositivos > Chrome > Apps e extensões > Usuários e navegadores**, selecione a unidade organizacional da equipe de tecnologia e adicione a extensão pelo ID e pela URL personalizada do `updates.xml`. Defina a política como **Forçar instalação**. A extensão coleta apenas os dados locais que o ChromeOS disponibiliza para ela; não coleta fabricante, modelo ou número de série.

## Assinatura e atualizações

A chave privada de assinatura `.pem` não faz parte deste repositório. Guarde-a em local controlado pela equipe de tecnologia, com cópia de segurança. Para atualizar, mantenha a mesma chave, incremente a versão no `manifest.json`, gere um novo CRX assinado, substitua o arquivo em `docs/chromeos-flex/` e atualize `updates.xml`.

## Privacidade

O site distribui somente o código e o instalador da extensão. A extensão coleta informações localmente e não envia relatórios ou dados do equipamento para este repositório ou para o Pages. Qualquer pessoa pode baixar o código e o pacote; a instalação é controlada pela política de usuários e navegadores do colégio.
