import { stripModelThinking } from "../src/lib/stripModelThinking.ts";

const sample = `<think>
The user wants me to extract information from a medical report image.
Looking closely at the image...
Wait, looking at the date...
</think>

Patient ID: AA716300
Patient Name: FAREEQA
Paracetamol: Bed time - for 5 days
Hemoglobin: 10.9 g/dL`;

const out = stripModelThinking(sample);
console.log(out);
if (out.includes("<think") || /looking closely/i.test(out) || /The user wants/i.test(out)) {
  console.error("FAIL: thinking leaked");
  process.exit(1);
}
if (!/AA716300/.test(out) || !/FAREEQA/.test(out)) {
  console.error("FAIL: clinical text lost");
  process.exit(1);
}
console.log("OK stripModelThinking");
