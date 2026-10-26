export const attemptLabels = {
  en: {
    questions: (total: number) => (total === 1 ? "1 question." : `${String(total)} questions.`),
    startAt: (number: number) => `Start with question ${String(number)}`,
    stoppedAt: (number: number) => `You stopped at question ${String(number)}.`,
    goTo: (number: number) => `Go to question ${String(number)}`,
    allAnswered: "Every question answered.",
    toRevisit: "See what to revisit",
    toEnd: "Go to the end of the page",
    next: "Next:",
    question: (number: number) => `Question ${String(number)}`,
    revisit: "To revisit",
    end: "End of the page",
  },
  pt: {
    questions: (total: number) => (total === 1 ? "1 questão." : `${String(total)} questões.`),
    startAt: (number: number) => `Começar pela questão ${String(number)}`,
    stoppedAt: (number: number) => `Você parou na questão ${String(number)}.`,
    goTo: (number: number) => `Ir para a questão ${String(number)}`,
    allAnswered: "Todas as questões respondidas.",
    toRevisit: "Ver o que revisar",
    toEnd: "Ir para o fim da página",
    next: "A seguir:",
    question: (number: number) => `Questão ${String(number)}`,
    revisit: "Para revisar",
    end: "Fim da página",
  },
};

export type AttemptLabels = (typeof attemptLabels)["en"];
