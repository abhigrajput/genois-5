export const DOMAINS = [
  { id:'fullstack',     name:'Full Stack Dev',        icon:'🌐', color:'#00FF94', desc:'React, Node.js, MongoDB, REST APIs' },
  { id:'dsa',           name:'DSA & Algorithms',      icon:'🧠', color:'#7B61FF', desc:'Arrays, Trees, DP, Graphs, LeetCode' },
  { id:'aiml',          name:'AI & Machine Learning', icon:'🤖', color:'#4A9EFF', desc:'Python, PyTorch, NLP, LLMs, RAG' },
  { id:'cybersecurity', name:'Cybersecurity',         icon:'🔐', color:'#FF6B6B', desc:'PenTest, OWASP, CTF, Bug Bounty' },
  { id:'devops',        name:'DevOps & Cloud',        icon:'☁️', color:'#FFB347', desc:'Docker, K8s, AWS, CI/CD, Terraform' },
  { id:'android',       name:'Mobile Dev',            icon:'📱', color:'#00D68F', desc:'Kotlin, Jetpack Compose, Firebase' },
  { id:'datascience',   name:'Data Science',          icon:'📊', color:'#FF6EFF', desc:'Pandas, SQL, Visualization, Stats' },
  { id:'blockchain',    name:'Blockchain & Web3',     icon:'⛓️', color:'#F7931A', desc:'Solidity, Smart Contracts, DeFi' },
  { id:'gamedev',       name:'Game Development',      icon:'🎮', color:'#00CFFF', desc:'Unity, C#, 3D, Physics, Publishing' },
  { id:'systemdesign',  name:'System Design',         icon:'🏗️', color:'#AAFF00', desc:'Scalability, Microservices, Architecture' },
];

export const getDomain = (id) => DOMAINS.find(d => d.id === id) || DOMAINS[0];
