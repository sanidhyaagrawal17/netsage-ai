export function parseCiscoPrompt(cliText) {
  if (!cliText || typeof cliText !== "string") {
    return { mode: "Unknown", prompt: "" };
  }
  
  const lines = cliText.split("\n").map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) return { mode: "Unknown", prompt: "" };
  
  const lastLine = lines[lines.length - 1];
  
  if (lastLine.endsWith(">")) {
    return { mode: "User EXEC Mode", prompt: lastLine };
  }
  
  if (lastLine.endsWith("#")) {
    if (lastLine.includes("(config)#")) return { mode: "Global Configuration Mode", prompt: lastLine };
    if (lastLine.includes("(config-if)#")) return { mode: "Interface Configuration Mode", prompt: lastLine };
    if (lastLine.includes("(config-router)#")) return { mode: "Router Configuration Mode", prompt: lastLine };
    if (lastLine.includes("(config-line)#")) return { mode: "Line Configuration Mode", prompt: lastLine };
    if (lastLine.includes("(config-vlan)#")) return { mode: "VLAN Configuration Mode", prompt: lastLine };
    if (lastLine.includes("(config-subif)#")) return { mode: "Subinterface Configuration Mode", prompt: lastLine };
    if (lastLine.includes("(vlan)#")) return { mode: "VLAN Database Mode", prompt: lastLine };
    
    if (!lastLine.includes(")")) {
       return { mode: "Privileged EXEC Mode", prompt: lastLine };
    }
    
    return { mode: "Specific Configuration Mode", prompt: lastLine };
  }
  
  return { mode: "Unknown", prompt: "" };
}
