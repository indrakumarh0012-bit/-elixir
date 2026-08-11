/**
 * Remove model chain-of-thought / analysis process from visible outputs.
 * Qwen and similar models often emit <think>…</think> before the real answer.
 */
export function stripModelThinking(text: string): string {
  if (!text) return "";
  let t = text;

  // XML-style think / reasoning blocks (including unclosed)
  t = t.replace(/<think\b[^>]*>[\s\S]*?(?:<\/think>|$)/gi, "");
  t = t.replace(/<\/?think\b[^>]*>/gi, "");
  t = t.replace(/<thinking\b[^>]*>[\s\S]*?(?:<\/thinking>|$)/gi, "");
  t = t.replace(/<\/?thinking\b[^>]*>/gi, "");
  t = t.replace(/<reasoning\b[^>]*>[\s\S]*?(?:<\/reasoning>|$)/gi, "");
  t = t.replace(/<\/?reasoning\b[^>]*>/gi, "");

  // Markdown / plain “thinking” dumps before the real extract
  t = t.replace(
    /^(?:#{1,6}\s*)?(?:thinking|thought process|analysis|reasoning|let me (?:analyze|examine|look)|i(?:'ll| will) (?:analyze|extract|examine))[\s\S]*?(?=\n(?:#{1,6}\s*)?(?:hospital|patient|diagnosis|prescription|labs?|report|extract|demographics|name|uhid|clinical)\b)/gim,
    "",
  );

  // Lines that are pure process narration
  t = t
    .split(/\r?\n/)
    .filter((line) => {
      const l = line.trim().toLowerCase();
      if (!l) return true;
      if (/^(\*\*)?(thinking|thought process|analysis process|my analysis)\b/.test(l)) {
        return false;
      }
      if (
        /^(the user wants me to|i need to extract|let me (look|analyze|examine|re-examine)|looking (closely|at the)|wait,?\s+looking|okay,?\s+i will|this is strange)/i.test(
          l,
        )
      ) {
        return false;
      }
      if (/^\*\*\d+\.\s*analy(z|s)e the image/i.test(l)) return false;
      return true;
    })
    .join("\n");

  return t.replace(/\n{3,}/g, "\n\n").trim();
}
