# vsenaa — desktop (wrapper Electron)

Janela compacta multiplataforma da PWA do vsenaa. Ao contrário do PWA instalado
pelo navegador (que tem um piso de largura imposto pelo navegador/SO), esta janela
pode encolher até `minWidth` (padrão **240px**). Mesmo código em Windows, macOS e Linux.

## Rodar (precisa de Node.js instalado)

```bash
cd desktop
npm install     # baixa o binário do Electron do seu SO automaticamente
npm start
```

No Windows, o `npm install` puxa o Electron pré-compilado para Windows — nada de
compilar nada.

## Configuração (variáveis de ambiente, todas opcionais)

| Variável        | Padrão                      | Descrição                      |
|-----------------|-----------------------------|--------------------------------|
| `TASKMGR_URL`   | `https://vsenaa.duckdns.org`| URL carregada                  |
| `TASKMGR_TOP`   | *(desligado)*               | `1` = janela sempre no topo    |
| `TASKMGR_W`     | `360`                       | largura inicial                |
| `TASKMGR_H`     | `720`                       | altura inicial                 |
| `TASKMGR_MINW`  | `240`                       | largura mínima                 |
| `TASKMGR_MINH`  | `360`                       | altura mínima                  |

Exemplos:

```bash
# Windows (PowerShell) — janelinha de 300px, sempre no topo
$env:TASKMGR_MINW=200; $env:TASKMGR_W=300; $env:TASKMGR_TOP=1; npm start

# Linux/macOS
TASKMGR_MINW=200 TASKMGR_W=300 TASKMGR_TOP=1 npm start
```

## Gerar um .exe / instalador (opcional)

Para distribuir sem exigir Node, adicione um empacotador — o mais simples é
`electron-builder`:

```bash
npm install --save-dev electron-builder
npx electron-builder --win     # gera instalador Windows em dist/
```

(Para macOS/Linux troque `--win` por `--mac` / `--linux`. Cada plataforma precisa
ser empacotada no seu próprio SO.)
