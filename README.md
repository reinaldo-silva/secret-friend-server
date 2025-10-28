# Sorteio Backend (WebSocket, TypeScript)

Servidor WebSocket simples para gerenciar salas de "amigo secreto".

Princípios implementados:

- Não permite duas salas com o mesmo `roomId`.
- Todas as mensagens rodam em memória (não há persistence em banco).
- O admin pode criar sala, adicionar participantes manualmente, iniciar sorteio.
- Quando o sorteio é iniciado o servidor gera o pareamento e envia:
- um evento privado para cada participante contendo apenas o seu amigo secreto;
- um evento para o admin com o mapeamento completo (para que o front-end do admin
  guarde no localStorage, conforme sua especificação).

## Rodar localmente

1. `npm install`
2. `npm run dev` (desenvolvimento) ou `npm run build && npm start` (produção)

No Render, a variável de ambiente `PORT` pode ser usada; por padrão o servidor usa a porta 3000.
