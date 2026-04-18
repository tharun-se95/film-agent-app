

const PROJECT_REF = "qpwyxbtozlqbdpdjmnis";
const ACCESS_TOKEN = "sbp_3d0ef458da56000bc00ee211d2ddaa77afa19e7c";

async function checkStatus() {
  console.log(`Checking status for project: ${PROJECT_REF}...`);
  const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}`, {
    headers: {
      "Authorization": `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json"
    }
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Failed to fetch status:", error);
    return;
  }

  const project = await response.json();
  console.log("Project Status:", project.status);
}

checkStatus();
