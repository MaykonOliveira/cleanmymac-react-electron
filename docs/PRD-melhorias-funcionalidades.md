# PRD — Melhorias Substanciais de Funcionalidades

- **Produto:** CleanMyMac Pro (React + Electron)
- **Versão do PRD:** 1.0
- **Data:** 19 de abril de 2026
- **Autor:** Time de Produto
- **Status:** Proposta para planejamento

## 1) Contexto

O aplicativo já entrega uma base sólida de limpeza para macOS (escaneamento por categorias, exclusão segura para Lixeira e controle de permissões). O próximo ciclo precisa evoluir de uma experiência “manual e pontual” para uma experiência **contínua, inteligente e previsível**, focada em:

1. Aumentar confiança do usuário antes da remoção.
2. Melhorar eficiência operacional com automação controlada.
3. Reduzir fricção em permissões e entendimento de impacto.
4. Ampliar retenção com valor recorrente (saúde do sistema ao longo do tempo).

## 2) Problema

Atualmente, usuários conseguem limpar arquivos, porém ainda enfrentam lacunas comuns:

- Dificuldade para priorizar o que realmente vale limpar (muito volume, pouco contexto).
- Falta de histórico e rastreabilidade das limpezas realizadas.
- Ausência de automação por regras (dependência de ação manual).
- Pouca capacidade de prever impacto em espaço liberado e risco.
- Visão limitada de “saúde do sistema” ao longo de dias/semanas.

## 3) Objetivos do Produto

### Objetivo principal
Transformar o app em um **assistente de manutenção proativo**, com decisões explicáveis e operação segura.

### Objetivos secundários
- Reduzir em 40% o tempo médio entre abertura do app e conclusão de limpeza.
- Aumentar em 25% a taxa de execução de limpeza recorrente semanal.
- Reduzir em 50% o número de cancelamentos de limpeza por insegurança do usuário.

## 4) Escopo da iniciativa

### Incluído
- Motor de recomendações inteligentes.
- Automação e agendamento de limpezas.
- Histórico completo com auditoria e rollback assistido.
- Dashboard de saúde do sistema.
- Gestão avançada de permissões e cobertura de scan.
- Otimizações de performance de scan e UX de decisão.

### Fora de escopo (neste ciclo)
- Versão para Windows/Linux.
- Integrações com provedores cloud para limpeza remota.
- Recursos de antivírus/malware.

## 5) Perfis de usuário

1. **Usuário casual**
   - Quer liberar espaço rapidamente sem entender detalhes técnicos.
   - Valoriza botão único, risco mínimo e linguagem simples.

2. **Usuário avançado**
   - Quer granularidade por pasta/tipo e regras persistentes.
   - Valoriza previsibilidade, automação e histórico detalhado.

3. **Profissional de suporte/TI pessoal**
   - Limpa múltiplas máquinas periodicamente.
   - Valoriza relatórios, consistência e rastreabilidade.

## 6) Requisitos funcionais (melhorias substanciais)

## RF-01 — Recomendação Inteligente de Limpeza (com score)

**Descrição:**
Após o scan, cada item/categoria deve receber um **score de prioridade** considerando:
- Tamanho total recuperável.
- Tempo sem uso/modificação.
- Recorrência de reaparecimento.
- Sensibilidade do diretório (risco).

**Experiência esperada:**
- Exibir selo: “Recomendado”, “Revisar”, “Evitar”.
- Tooltip explicando em linguagem simples por que o item foi classificado assim.

**Critérios de aceitação:**
- Usuário consegue ordenar por score.
- Todo item recomendado possui justificativa visível.
- Nenhum item de alto risco entra como “Recomendado” por padrão.

---

## RF-02 — Simulação de Limpeza (What-if)

**Descrição:**
Antes de confirmar exclusão, o usuário pode simular cenários:
- “Apenas recomendados”.
- “Agressivo”.
- “Conservador”.
- Seleção personalizada.

**Experiência esperada:**
- Exibir “espaço estimado liberado”.
- Exibir nível de risco consolidado por cenário.

**Critérios de aceitação:**
- Troca de cenário recalcula estimativas em até 500ms para listas até 20k itens.
- Usuário vê diferenças entre cenários sem perder seleção manual.

---

## RF-03 — Agendamento e Automação por Regras

**Descrição:**
Permitir rotinas automáticas com regras configuráveis:
- Frequência: diária, semanal, mensal.
- Janela de execução (ex.: madrugada).
- Condição por espaço em disco (ex.: iniciar se livre < 15%).
- Modo: só sugerir / executar automaticamente itens de baixo risco.

**Experiência esperada:**
- Centro de automação com templates prontos.
- Notificação de execução + resumo de resultados.

**Critérios de aceitação:**
- Usuário consegue pausar/retomar automações em 1 clique.
- Toda execução automática gera log com timestamp e itens afetados.

---

## RF-04 — Histórico, Auditoria e Recuperação Assistida

**Descrição:**
Criar linha do tempo de limpezas realizadas:
- Data/hora, categorias, tamanho liberado, duração, modo de execução.
- Itens enviados para Lixeira com referência para recuperação.

**Experiência esperada:**
- Tela de histórico com filtros por período e categoria.
- Ação “abrir na Lixeira / localizar item original”.

**Critérios de aceitação:**
- Usuário consegue exportar relatório CSV/JSON.
- Histórico preserva no mínimo 180 dias de eventos.

---

## RF-05 — Dashboard de Saúde do Sistema

**Descrição:**
Tela com indicadores contínuos:
- Evolução de espaço livre x ocupado.
- Tendência de crescimento de lixo por categoria.
- Frequência de limpezas e eficiência (GB liberados por sessão).

**Experiência esperada:**
- Gráficos semanais/mensais.
- Insights automáticos (ex.: “Downloads antigos cresceu 22% na semana”).

**Critérios de aceitação:**
- Dashboard carrega em até 2s com dados locais de 12 meses.
- Insights possuem regra explícita e auditável.

---

## RF-06 — Gerenciador de Permissões e Cobertura de Scan

**Descrição:**
Aprimorar a experiência de permissões já existente:
- Mapa de cobertura do que está sendo analisado x bloqueado.
- Assistente guiado para conceder permissões faltantes.
- Revalidação automática de permissões quebradas.

**Experiência esperada:**
- Painel “Cobertura atual: 78%” com ações recomendadas.
- Mensagens objetivas sobre impacto da permissão negada.

**Critérios de aceitação:**
- Usuário identifica facilmente por que uma pasta não foi analisada.
- Fluxo de correção de permissão reduz em 30% os scans incompletos.

---

## RF-07 — Exclusões e Regras Persistentes (Allowlist / Blocklist)

**Descrição:**
Permitir que usuário defina políticas permanentes:
- Nunca tocar em certos diretórios/arquivos.
- Sempre incluir determinados alvos seguros.
- Regras por padrão de nome/extensão.

**Critérios de aceitação:**
- Regras são aplicadas em scan manual e automático.
- Conflitos de regra são explicados na interface.

---

## RF-08 — Modo “Limpeza em 1 Clique” (Guided Fast Path)

**Descrição:**
Novo fluxo para usuários casuais:
- Botão principal executa scan rápido + pré-seleção segura + confirmação simplificada.

**Critérios de aceitação:**
- Fluxo completo em até 3 passos.
- Usuário pode expandir detalhes sem sair do fluxo principal.

## 7) Requisitos não funcionais

- **Performance:**
  - Scan incremental: reduzir tempo de scans recorrentes em 35%.
  - Renderização fluida para listas grandes (virtualização).
- **Segurança:**
  - Exclusão segue política de envio à Lixeira, sem hard delete por padrão.
  - Logs de ações críticas com trilha auditável local.
- **Confiabilidade:**
  - Reexecução idempotente de tarefas agendadas.
  - Recuperação segura após falha de energia/crash.
- **Privacidade:**
  - Processamento local por padrão.
  - Telemetria opt-in e anonimizada (se habilitada).

## 8) UX/UI — Diretrizes

- Linguagem sempre em português claro e orientada a decisão.
- Evitar jargão técnico para risco; usar semáforo visual + explicação curta.
- Reforçar confiança em todas as confirmações (“Você pode recuperar pela Lixeira”).
- Destacar impacto real: GB liberados, tempo economizado, tendência semanal.

## 9) Métricas de sucesso (KPIs)

- Tempo médio até limpeza concluída (TTC).
- % de usuários que usam automação ao menos 1x/semana.
- Taxa de aceitação de recomendações inteligentes.
- Redução de scans incompletos por permissão.
- NPS de confiança na limpeza (pergunta in-app pós-execução).

## 10) Plano de implementação por fases

### Fase 1 — Base de confiança (4–6 semanas)
- RF-01 Recomendação inteligente (versão inicial).
- RF-02 Simulação de limpeza.
- RF-04 Histórico e auditoria básica.

### Fase 2 — Escala operacional (4–6 semanas)
- RF-03 Agendamento e automação.
- RF-07 Regras persistentes.
- Otimizações de performance (scan incremental e virtualização).

### Fase 3 — Valor contínuo (3–5 semanas)
- RF-05 Dashboard de saúde.
- RF-06 Gerenciador de permissões avançado.
- RF-08 Fluxo 1-clique refinado com onboarding.

## 11) Riscos e mitigação

- **Risco:** falso positivo em recomendação automática.  
  **Mitigação:** limites conservadores + revisão humana no início + feature flag.

- **Risco:** automação apagar algo sensível (mesmo indo para Lixeira).  
  **Mitigação:** bloquear diretórios críticos por padrão + modo “auto” só para baixo risco.

- **Risco:** degradação de performance com histórico grande.  
  **Mitigação:** indexação local, paginação e retenção configurável.

## 12) Dependências técnicas

- Evolução dos contratos IPC para suportar:
  - simulação de cenários,
  - motor de score,
  - agendamento,
  - consultas históricas.
- Camada de persistência local para logs, regras e snapshots de métricas.
- Mecanismo de migração de schema para dados locais entre versões.

## 13) Critério de pronto (Definition of Done)

Uma melhoria deste PRD é considerada pronta quando:
1. Critérios de aceitação funcionais atendidos.
2. Cobertura mínima de testes (unitário + integração IPC crítica).
3. Documentação atualizada (README + guia de uso da funcionalidade).
4. Métrica associada instrumentada e validada em ambiente interno.
5. Checklist de segurança e privacidade aprovado.

## 14) Próximos passos imediatos

1. Quebrar cada RF em épicos e histórias técnicas.
2. Estimar esforço (engenharia, design, QA) por fase.
3. Validar protótipos de RF-01/RF-02 com 5 usuários.
4. Priorizar backlog da Fase 1 para próximo sprint.
