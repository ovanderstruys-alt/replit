import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY must be set.");
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function verifyProof(
  taskName: string,
  taskDescription: string | null | undefined,
  proofType: "photo" | "video",
  base64Image: string
): Promise<{ verified: boolean; message: string }> {
  try {
    // Strip data URL prefix if present
    const imageData = base64Image.replace(/^data:image\/[a-z]+;base64,/, "");

    const prompt = taskDescription
      ? `The user is trying to complete a task called "${taskName}". Task description: "${taskDescription}". They have submitted a ${proofType} as proof.`
      : `The user is trying to complete a task called "${taskName}". They have submitted a ${proofType} as proof.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 200,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `${prompt}\n\nDoes this image plausibly show evidence of completing that task? Look for any relevant visual clues. Be somewhat lenient — if the image could reasonably relate to the task, accept it. Respond with JSON only: { "verified": true/false, "message": "brief one-sentence explanation" }`,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageData}`,
                detail: "low",
              },
            },
          ],
        },
      ],
    });

    const content = response.choices[0]?.message?.content ?? "";
    // Parse the JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        verified: Boolean(parsed.verified),
        message: String(parsed.message ?? "Verification complete."),
      };
    }

    return { verified: false, message: "Could not parse AI verification response." };
  } catch (err) {
    return { verified: false, message: "AI verification failed. Please try again." };
  }
}
