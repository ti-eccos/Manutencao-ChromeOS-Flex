# Extensão de inventário para ChromeOS Flex

## Objetivo

Coletar automaticamente informações expostas pelas APIs oficiais do ChromeOS e apresentar um inventário local para a equipe de tecnologia ECCOS.

## Implantação

- Extensão Manifest V3, auto-hospedada no GitHub Pages e force-installed para a unidade organizacional da equipe de tecnologia pelo Google Admin Console.
- Os dados coletados nesta versão não exigem inscrição do dispositivo nem APIs corporativas de hardware.
- O Admin Console instala a extensão pelo URL personalizado do manifesto XML; não instala diretamente o ZIP do pen drive. O fluxo completo está em `IMPLANTACAO_ADMIN_CONSOLE.md`.

## Dados coletados localmente

- Versão do ChromeOS Flex e do Chrome.
- CPU, arquitetura, quantidade de processadores lógicos e sensores de temperatura expostos.
- Total de RAM e memória disponível/em uso.
- Unidades fixas detectadas, tipo e capacidade total. Capacidade livre somente quando a API estiver disponível.
- PDF via impressão do Chrome, XLSX e Markdown baixados localmente.

## Privacidade e limites

- Sem chamada de rede, conta OAuth ou transmissão dos dados para fora do dispositivo.
- Fabricante, modelo e número de série não são coletados pela extensão; consulte-os manualmente em `chrome://system` quando disponíveis.
- Saúde da bateria, ciclos, SMART e alguns diagnósticos não estão disponíveis na API local; usar o Diagnóstico integrado do ChromeOS para essas verificações.
- Não executa ações de manutenção, reparo ou alteração de rede.
- Dados não disponibilizados são indicados como tal, sem preencher valores estimados.
