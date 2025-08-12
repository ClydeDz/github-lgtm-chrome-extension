const messages = [
  "LGTM",
  "LGTM!",
  "LGTM! 👍",
  "Nice work!",
  "Approved, nice work!",
  "🚀",
  "LGTM! 🚀",
];

export function getReviewMessage() {
  var index = Math.floor(Math.random() * messages.length);
  return messages[index];
}
