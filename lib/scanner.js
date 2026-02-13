// Patterns that indicate potentially malicious behavior.
// Each pattern has a regex and a warning message.
const maliciousPatterns = [
  {
    name: 'infinite_loop',
    regex: /\b(while\s*\(\s*true\s*\)|for\s*\(\s*;\s*;\s*\))\b/i,
    warning: 'Program contains an unconditional infinite loop (while(true) or for(;;)). This may freeze the browser.'
  },
  {
    name: 'resource_exhaustion',
    regex: /\b(allocate\s+massive|new\s+Array\s*\(\s*1e[0-9]+\s*\)|malloc\s*\(\s*[0-9]{7,}\s*\))/i,
    warning: 'Attempts to allocate excessive memory, could crash the browser.'
  },
  {
    name: 'system_call',
    regex: /\b(system\s*\(|exec\s*\(|eval\s*\(|require\s*\(|import\s*\(|fetch\s*\(|XMLHttpRequest)/i,
    warning: 'Uses system calls or external requests, which are restricted for security.'
  },
  {
    name: 'disk_access',
    regex: /\b(fs\.|writeFile|readFile|unlink|rmdir|mkdir)/i,
    warning: 'Attempts to access the file system, which is not allowed in the browser.'
  },
  {
    name: 'crypto_mining',
    regex: /\b(crypto|miner|hash\s*loop|proof\s*of\s*work|scrypt)/i,
    warning: 'Contains crypto-mining patterns, may use user resources without consent.'
  },
  {
    name: 'obfuscation',
    regex: /\b(eval\s*\(\s*atob\s*\(|unescape\s*\(|String\.fromCharCode\s*\(\s*[0-9,\s]{100,})/i,
    warning: 'Uses obfuscation techniques often associated with malicious code.'
  }
];

// Scanner returns { status: 'clean'|'malicious', warning: string|null }
export async function scanProgram(content) {
  if (typeof content !== 'string') {
    throw new Error('Program content must be a string');
  }

  const warnings = [];

  for (const pattern of maliciousPatterns) {
    if (pattern.regex.test(content)) {
      warnings.push(pattern.warning);
    }
  }

  if (warnings.length > 0) {
    return {
      status: 'malicious',
      warning: warnings.join(' ')
    };
  }

  return {
    status: 'clean',
    warning: null
  };
}
