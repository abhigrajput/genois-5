import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Zap, RotateCcw,
         CheckCircle, XCircle, Trophy } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { supabase } from '../../lib/supabase';
import useStore from '../../store/useStore';
import toast from 'react-hot-toast';

const QUESTION_BANKS = {
  fullstack: [
    { q:'What does HTML stand for?', opts:['Hyper Text Markup Language','High Tech Modern Language','Hyper Transfer Markup Language','Home Tool Markup Language'], ans:0, exp:'HTML = Hyper Text Markup Language. It is the standard markup language for web pages.' },
    { q:'Which CSS property is used to change text color?', opts:['text-color','font-color','color','foreground-color'], ans:2, exp:'The color property in CSS is used to set the color of text.' },
    { q:'What is the correct way to declare a JavaScript variable?', opts:['variable x = 5','v x = 5','let x = 5','declare x = 5'], ans:2, exp:'let, const, and var are used to declare variables in JavaScript.' },
    { q:'Which method adds an element to end of array?', opts:['push()','pop()','shift()','unshift()'], ans:0, exp:'push() adds one or more elements to the end of an array.' },
    { q:'What does API stand for?', opts:['Application Programming Interface','App Protocol Integration','Automated Program Interface','Application Process Integration'], ans:0, exp:'API = Application Programming Interface.' },
    { q:'What is React primarily used for?', opts:['Server side rendering only','Building user interfaces','Database management','Network requests'], ans:1, exp:'React is a JavaScript library for building user interfaces.' },
    { q:'What hook manages state in React functional components?', opts:['useEffect','useState','useRef','useContext'], ans:1, exp:'useState is the hook for managing state in React functional components.' },
    { q:'What does useEffect do in React?', opts:['Manages state','Handles side effects like API calls','Creates components','Styles components'], ans:1, exp:'useEffect handles side effects like API calls, subscriptions, and DOM manipulation.' },
    { q:'What is Node.js?', opts:['A browser','A JavaScript runtime built on Chrome V8','A database','A CSS framework'], ans:1, exp:'Node.js is a JavaScript runtime environment built on Chrome V8 engine.' },
    { q:'Which HTTP method creates a new resource?', opts:['GET','PUT','POST','DELETE'], ans:2, exp:'POST is used to create new resources in REST APIs.' },
    { q:'What is MongoDB?', opts:['SQL relational database','NoSQL document database','Graph database','In-memory cache'], ans:1, exp:'MongoDB is a NoSQL database storing data in JSON-like documents.' },
    { q:'What does JWT stand for?', opts:['Java Web Token','JSON Web Token','JavaScript Web Transfer','JSON Web Transfer'], ans:1, exp:'JWT = JSON Web Token, used for stateless authentication.' },
    { q:'What is npm?', opts:['Node Package Manager','New Programming Method','Node Process Manager','Network Protocol Manager'], ans:0, exp:'npm is the Node Package Manager for installing JavaScript packages.' },
    { q:'What is the purpose of async/await?', opts:['Style HTML pages','Handle asynchronous code cleanly','Declare variables','Create loops'], ans:1, exp:'async/await makes asynchronous code readable like synchronous code.' },
    { q:'What does DOM stand for?', opts:['Document Object Model','Data Object Method','Dynamic Output Model','Document Oriented Model'], ans:0, exp:'DOM = Document Object Model, the browser representation of HTML.' },
    { q:'What does CSS Grid provide?', opts:['1D layout system','2D layout system','3D animations','Backend routing'], ans:1, exp:'CSS Grid is a 2-dimensional layout system for rows and columns.' },
    { q:'Which operator checks value AND type in JavaScript?', opts:['==','!=','===','!=='], ans:2, exp:'=== is strict equality checking both value and type.' },
    { q:'What is a closure in JavaScript?', opts:['A way to close the browser','Function that accesses outer scope variables','A CSS property','A database concept'], ans:1, exp:'Closures allow inner functions to access variables from outer scope.' },
    { q:'What does CORS stand for?', opts:['Cross Origin Resource Sharing','Client Oriented Response System','Cross Object Reference Scheme','Content Origin Response Standard'], ans:0, exp:'CORS = Cross Origin Resource Sharing, controls cross-domain requests.' },
    { q:'What is Flexbox?', opts:['A JavaScript framework','A CSS 1D layout system','A database tool','A Node.js module'], ans:1, exp:'Flexbox is a CSS layout model for distributing space in one direction.' },
  ],
  cybersecurity: [
    { q:'What does SQL Injection do?', opts:['Speeds up database queries','Injects malicious SQL into queries to manipulate DB','Encrypts database data','Validates user input'], ans:1, exp:'SQL Injection inserts malicious SQL code to manipulate databases.' },
    { q:'What is XSS?', opts:['Extra Style Sheet','Cross Site Scripting attack','Cross Server Security','Extreme Security System'], ans:1, exp:'XSS = Cross Site Scripting, injects malicious scripts into web pages.' },
    { q:'What does HTTPS use for encryption?', opts:['MD5','SHA-1','TLS/SSL','Base64'], ans:2, exp:'HTTPS uses TLS/SSL to encrypt data between browser and server.' },
    { q:'What is a firewall?', opts:['Hardware device only','Software or hardware that monitors and controls network traffic','A type of malware','An encryption algorithm'], ans:1, exp:'Firewalls monitor and control incoming and outgoing network traffic based on rules.' },
    { q:'What is phishing?', opts:['A fishing technique','Fraudulent attempt to steal credentials via deception','A network scanning tool','An encryption method'], ans:1, exp:'Phishing tricks users into revealing sensitive information via fake communications.' },
    { q:'What does Nmap do?', opts:['Encrypts files','Scans networks to discover hosts and open ports','Manages passwords','Monitors application logs'], ans:1, exp:'Nmap is a network scanner that discovers hosts, services, and open ports.' },
    { q:'What is a zero-day vulnerability?', opts:['A bug fixed immediately after discovery','Unknown vulnerability with no available patch','A common well-known bug','A firewall rule type'], ans:1, exp:'Zero-day vulnerabilities are unknown to vendors and have no patch available.' },
    { q:'What is the OWASP Top 10?', opts:['Top 10 programming languages','Top 10 critical web application security risks','Top 10 hacking tools','Top 10 databases ranked'], ans:1, exp:'OWASP Top 10 lists the most critical web application security risks.' },
    { q:'What does AES stand for?', opts:['Advanced Encryption Standard','Automated Encoding System','Advanced Exchange Server','Application Encryption Standard'], ans:0, exp:'AES = Advanced Encryption Standard, a symmetric encryption algorithm.' },
    { q:'What is a VPN?', opts:['Virtual Private Network','Very Protected Node','Virtual Protocol Network','Verified Private Node'], ans:0, exp:'VPN creates an encrypted tunnel for private and secure internet connections.' },
    { q:'What is social engineering in security?', opts:['Building social media platforms','Manipulating people psychologically to reveal information','Writing social networking code','Engineering social applications'], ans:1, exp:'Social engineering exploits human psychology rather than technical vulnerabilities.' },
    { q:'What tool is used for packet capture and analysis?', opts:['Metasploit','Burp Suite','Wireshark','Nessus'], ans:2, exp:'Wireshark is a network protocol analyzer used to capture and analyze packets.' },
    { q:'What is a brute force attack?', opts:['A physical server attack','Systematically trying all possible passwords or keys','A social engineering method','A SQL injection variant'], ans:1, exp:'Brute force attacks systematically try all possible combinations to find the right one.' },
    { q:'What is penetration testing?', opts:['Testing hardware performance','Authorized simulated cyberattack to find vulnerabilities','Testing network bandwidth','Database performance testing'], ans:1, exp:'Penetration testing is authorized ethical hacking to find security vulnerabilities.' },
    { q:'What does CIA stand for in information security?', opts:['Central Intelligence Agency','Confidentiality Integrity Availability','Coded Information Access','Cyber Intrusion Analysis'], ans:1, exp:'CIA Triad = Confidentiality, Integrity, Availability — the core security principles.' },
    { q:'What is ransomware?', opts:['Security software protecting files','Malware that encrypts victim files and demands ransom payment','A firewall type','An antivirus scanning tool'], ans:1, exp:'Ransomware encrypts victim files and demands cryptocurrency payment for decryption key.' },
    { q:'What is a CSRF attack?', opts:['Cross Site Request Forgery','Client Server Response Failure','Coded Security Response Filter','Cross System Resource Fetch'], ans:0, exp:'CSRF tricks authenticated users into submitting unwanted requests to a web application.' },
    { q:'What is Burp Suite primarily used for?', opts:['Network port scanning','Web application security testing and interception','Password cracking and management','Disk encryption management'], ans:1, exp:'Burp Suite is an integrated platform for web application security testing.' },
    { q:'What is a honeypot in cybersecurity?', opts:['A sweet database system','A decoy system designed to detect and study attackers','A type of hardware firewall','An encryption algorithm'], ans:1, exp:'Honeypots are decoy systems designed to detect, deflect, and study attackers.' },
    { q:'What does IDS stand for?', opts:['Internet Data Service','Intrusion Detection System','Internal Domain Security','Integrated Defense System'], ans:1, exp:'IDS = Intrusion Detection System, monitors networks for malicious activity or policy violations.' },
  ],
  dsa: [
    { q:'What is the time complexity of binary search?', opts:['O(n)','O(n²)','O(log n)','O(1)'], ans:2, exp:'Binary search halves the search space each step, giving O(log n) time complexity.' },
    { q:'Which data structure uses LIFO order?', opts:['Queue','Stack','Linked List','Tree'], ans:1, exp:'Stack uses Last In First Out (LIFO) — last element added is first to be removed.' },
    { q:'What is the worst case time complexity of bubble sort?', opts:['O(n log n)','O(n)','O(n²)','O(log n)'], ans:2, exp:'Bubble sort has O(n²) worst and average case time complexity.' },
    { q:'In a Binary Search Tree, where are smaller values stored?', opts:['Right subtree','Left subtree','Root only','Random position'], ans:1, exp:'In BST, left child < parent < right child for every node.' },
    { q:'What does DFS stand for in graph algorithms?', opts:['Data File System','Depth First Search','Distributed File Storage','Dynamic Function Search'], ans:1, exp:'DFS = Depth First Search, explores as far as possible before backtracking.' },
    { q:'What is dynamic programming?', opts:['Programming with dynamic types','Optimization by storing subproblem results to avoid recomputation','A graph traversal method','A sorting algorithm type'], ans:1, exp:'DP solves complex problems by breaking into subproblems and caching results.' },
    { q:'What extra space does merge sort require?', opts:['O(1)','O(log n)','O(n)','O(n²)'], ans:2, exp:'Merge sort requires O(n) extra space for temporary arrays during merging.' },
    { q:'Which algorithm finds shortest path in weighted graph?', opts:['DFS','BFS','Dijkstra','Bubble Sort'], ans:2, exp:'Dijkstra finds shortest paths from source to all other vertices in weighted graphs.' },
    { q:'What is a hash table?', opts:['A sorted array structure','Data structure using hash function to map keys to array indices','A linked list variant','A type of binary tree'], ans:1, exp:'Hash tables use a hash function to efficiently map keys to storage locations.' },
    { q:'What defines recursion in programming?', opts:['A for loop','A function that calls itself with a base case to stop','A sorting technique','A data storage structure'], ans:1, exp:'Recursion is when a function calls itself, with a base case to prevent infinite calls.' },
    { q:'What does Big O notation measure?', opts:['Exact runtime in milliseconds','Upper bound of algorithm time/space complexity growth','Lower bound of complexity','Average case execution time'], ans:1, exp:'Big O notation describes the upper bound of how an algorithm scales with input size.' },
    { q:'What is a queue data structure?', opts:['LIFO data structure','FIFO data structure (first in first out)','Random access structure','Hierarchical tree structure'], ans:1, exp:'Queue uses First In First Out (FIFO) — first element added is first removed.' },
    { q:'What is memoization?', opts:['A memory management technique','Caching results of expensive function calls for reuse','A sorting optimization technique','Garbage collection process'], ans:1, exp:'Memoization stores results of expensive function calls to avoid recomputation.' },
    { q:'What is quicksort average case time complexity?', opts:['O(n²)','O(n)','O(n log n)','O(log n)'], ans:2, exp:'Quicksort averages O(n log n) with good pivot selection.' },
    { q:'What is a graph in data structures?', opts:['A visual chart','Non-linear data structure with vertices connected by edges','A sorted array','A special type of tree'], ans:1, exp:'A graph consists of vertices (nodes) connected by edges, representing relationships.' },
    { q:'What does BFS stand for?', opts:['Binary File Search','Breadth First Search','Basic Function Syntax','Binary Format Storage'], ans:1, exp:'BFS = Breadth First Search, explores all neighbors at current depth before going deeper.' },
    { q:'What is a linked list?', opts:['An array with named indices','Sequence of nodes where each node points to the next','A type of hash table','A balanced tree structure'], ans:1, exp:'Linked list nodes contain data and a pointer to the next node in the sequence.' },
    { q:'What is the two pointer technique used for?', opts:['Using two variables for counting','Using two indices to solve array problems in O(n) time','A memory management approach','A graph traversal algorithm'], ans:1, exp:'Two pointers technique uses two indices moving through data to reduce time from O(n²) to O(n).' },
    { q:'What is a heap data structure?', opts:['Memory storage area','Complete binary tree with heap ordering property','A sorting algorithm itself','A linear graph type'], ans:1, exp:'A heap is a complete binary tree where parent is always greater (max-heap) or smaller (min-heap) than children.' },
    { q:'What is the sliding window technique?', opts:['A window resizing function','Technique using a fixed or variable window to process subarrays efficiently','A memory paging method','A graph algorithm'], ans:1, exp:'Sliding window maintains a window of elements and slides through array in O(n) time.' },
  ],
  aiml: [
    { q:'What is supervised learning?', opts:['Learning without any data','Learning from labeled training data with known outputs','Learning from unlabeled data only','Learning from rewards and penalties'], ans:1, exp:'Supervised learning trains models on labeled data where correct outputs are known.' },
    { q:'What does CNN stand for in deep learning?', opts:['Convolutional Neural Network','Connected Neural Node','Cyclic Network Node','Conventional Neural Network'], ans:0, exp:'CNN = Convolutional Neural Network, specialized for processing grid-like data like images.' },
    { q:'What is overfitting in machine learning?', opts:['Model performs too poorly on training data','Model memorizes training data but fails on new data','Model trains too slowly','Model uses too little memory'], ans:1, exp:'Overfitting occurs when model learns training data too well, failing to generalize to new data.' },
    { q:'What is the purpose of activation functions in neural networks?', opts:['To initialize weights','To introduce non-linearity enabling complex pattern learning','To normalize the input data','To reduce the learning rate'], ans:1, exp:'Activation functions introduce non-linearity, allowing networks to learn complex patterns.' },
    { q:'What is gradient descent?', opts:['A type of neural network','Optimization algorithm minimizing loss function by adjusting weights','A data preprocessing step','A regularization technique'], ans:1, exp:'Gradient descent iteratively adjusts model parameters to minimize the loss function.' },
    { q:'What does NLP stand for?', opts:['Neural Learning Process','Natural Language Processing','Network Layer Protocol','Numeric Learning Pattern'], ans:1, exp:'NLP = Natural Language Processing, field of AI dealing with human language.' },
    { q:'What is a transformer model?', opts:['An electrical device','Deep learning architecture using self-attention mechanism for sequences','A data transformation tool','A simple linear regression model'], ans:1, exp:'Transformers use self-attention to process sequential data, powering models like BERT and GPT.' },
    { q:'What is the train-test split used for?', opts:['Splitting data alphabetically','Separating data to evaluate model performance on unseen examples','Dividing neural network layers','Splitting features from labels'], ans:1, exp:'Train-test split evaluates how well model generalizes to data it has never seen before.' },
    { q:'What is a random forest?', opts:['A random collection of data','Ensemble of decision trees combining their predictions','A neural network type','A clustering algorithm'], ans:1, exp:'Random forest combines multiple decision trees, reducing overfitting through ensemble learning.' },
    { q:'What is transfer learning?', opts:['Moving model between computers','Reusing a pre-trained model on a new related task','Transferring data between databases','A data augmentation technique'], ans:1, exp:'Transfer learning adapts a pre-trained model to a new task, saving training time and data.' },
    { q:'What does RAG stand for in AI?', opts:['Random Augmented Generation','Retrieval Augmented Generation','Recursive Automated Graph','Real-time Artificial Generation'], ans:1, exp:'RAG = Retrieval Augmented Generation, combines information retrieval with text generation.' },
    { q:'What is a vector database used for in AI?', opts:['Storing regular SQL data','Storing and searching high-dimensional embeddings efficiently','Storing video files','Caching model weights'], ans:1, exp:'Vector databases store embeddings and enable efficient similarity search for AI applications.' },
    { q:'What is the vanishing gradient problem?', opts:['When gradients become zero due to many layers in deep networks','When loss function increases','When model has too few parameters','When learning rate is too high'], ans:0, exp:'Vanishing gradients occur in deep networks when gradient values become extremely small, stopping learning.' },
    { q:'What is precision in machine learning metrics?', opts:['Percentage of actual positives correctly identified','Percentage of predicted positives that are actually positive','Overall accuracy of model','F1 score calculation'], ans:1, exp:'Precision = True Positives / (True Positives + False Positives), quality of positive predictions.' },
    { q:'What is K-means clustering?', opts:['A supervised classification algorithm','Unsupervised algorithm grouping data into K clusters by similarity','A dimensionality reduction technique','A type of neural network'], ans:1, exp:'K-means is an unsupervised algorithm that groups data points into K clusters based on feature similarity.' },
    { q:'What is dropout in neural networks?', opts:['Removing the entire network','Regularization technique randomly disabling neurons during training','Reducing learning rate','Removing training data samples'], ans:1, exp:'Dropout randomly disables neurons during training, preventing overfitting by improving generalization.' },
    { q:'What is the purpose of embeddings in NLP?', opts:['To compress images','Converting words/tokens into dense numerical vectors capturing semantic meaning','To encrypt text data','To tokenize sentences'], ans:1, exp:'Embeddings represent words as dense vectors where similar words have similar vector representations.' },
    { q:'What is batch normalization?', opts:['Processing data in small batches','Normalizing layer inputs to stabilize and speed up training','A type of activation function','A weight initialization method'], ans:1, exp:'Batch normalization normalizes inputs of each layer to improve training stability and speed.' },
    { q:'What does LSTM stand for?', opts:['Long Short-Term Memory','Linear Sequence Training Model','Layered Sequence Training Method','Long Scale Transfer Model'], ans:0, exp:'LSTM = Long Short-Term Memory, a type of RNN designed to learn long-term dependencies.' },
    { q:'What is the difference between AI, ML, and DL?', opts:['They are identical terms','AI is broadest, ML is subset of AI, DL is subset of ML using neural networks','ML is broadest, AI is subset','DL came before ML'], ans:1, exp:'AI is the broadest concept. ML is a subset of AI. Deep Learning is a subset of ML using deep neural networks.' },
  ],
};

const getDefaultBank = (domainId) => {
  return QUESTION_BANKS[domainId] || QUESTION_BANKS['fullstack'];
};

const shuffleArray = (arr) => [...arr].sort(() => Math.random() - 0.5);

const getQuestions = (domainId, count) => {
  const bank = getDefaultBank(domainId);
  const shuffled = shuffleArray(bank);
  return shuffled.slice(0, Math.min(count, shuffled.length));
};

const TEST_CONFIGS = {
  daily:   { label:'Daily Test',   icon:'⚡', color:'#00FF94', questions:15, time:15, desc:'15 questions · 15 minutes' },
  weekly:  { label:'Weekly Test',  icon:'📅', color:'#7B61FF', questions:20, time:25, desc:'20 questions · 25 minutes' },
  monthly: { label:'Monthly Test', icon:'📆', color:'#FFB347', questions:30, time:40, desc:'30 questions · 40 minutes' },
};

const Tests = () => {
  const { profile, setProfile } = useStore();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(null);
  const [activeTest, setActiveTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (profile?.id) fetchTests();
  }, [profile?.id]);

  useEffect(() => {
    if (activeTest && !submitted) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [activeTest, submitted]);

  const fetchTests = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('tests').select('*, test_questions(*)')
        .eq('student_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(15);
      setTests(data || []);
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const generateTest = async (type) => {
    setGenerating(type);
    const cfg = TEST_CONFIGS[type];
    const domain = profile?.domain_id || 'fullstack';
    const today = new Date().toISOString().split('T')[0];
    const week = Math.ceil(new Date().getDate() / 7);
    const month = new Date().toLocaleDateString('en-IN', { month:'long', year:'numeric' });

    const title = type === 'daily'
      ? `Daily Test — ${today}`
      : type === 'weekly'
      ? `Weekly Test — Week ${week}`
      : `Monthly Test — ${month}`;

    try {
      const qs = getQuestions(domain, cfg.questions);

      const { data: testRow, error: tErr } = await supabase
        .from('tests').insert({
          student_id: profile.id,
          domain_id: domain,
          title,
          type,
          total_questions: qs.length,
          passing_score: 50,
          time_limit_minutes: cfg.time,
          status: 'pending',
          created_at: new Date().toISOString(),
        }).select().single();

      if (tErr) throw tErr;

      const { error: qErr } = await supabase
        .from('test_questions').insert(
          qs.map(q => ({
            test_id: testRow.id,
            question: q.q,
            options: q.opts,
            correct_answer: q.opts[q.ans],
            explanation: q.exp,
            topic: domain,
            marks: 1,
          }))
        );

      if (qErr) throw qErr;

      toast.success(`${cfg.label} ready! 🎯`);
      fetchTests();
    } catch(e) {
      console.error(e);
      toast.error('Failed: ' + e.message);
    }
    setGenerating(null);
  };

  const startTest = (test) => {
    const qs = test.test_questions || [];
    if (!qs.length) {
      toast.error('No questions in this test');
      return;
    }
    setActiveTest(test);
    setQuestions(qs);
    setAnswers({});
    setSubmitted(false);
    setResult(null);
    setTimeLeft((test.time_limit_minutes || 15) * 60);
  };

  const getOptions = (opts) => {
    if (!opts) return [];
    if (Array.isArray(opts)) return opts;
    if (typeof opts === 'string') {
      try { return JSON.parse(opts); } catch { return []; }
    }
    if (typeof opts === 'object') return Object.values(opts);
    return [];
  };

  const handleSubmit = async () => {
    clearInterval(timerRef.current);
    if (submitted) return;
    setSubmitted(true);

    let correct = 0;
    questions.forEach((q, i) => {
      const opts = getOptions(q.options);
      const userOpt = opts[answers[i]];
      if (userOpt === q.correct_answer) correct++;
    });

    const total = questions.length;
    const pct = Math.round((correct / total) * 100);
    const passed = pct >= 50;

    const weakAreas = questions
      .filter((q, i) => {
        const opts = getOptions(q.options);
        return opts[answers[i]] !== q.correct_answer;
      })
      .map(q => q.topic || profile?.domain_id || 'general');

    setResult({ correct, total, pct, passed, weakAreas });

    try {
      await supabase.from('tests').update({
        score: correct,
        percentage: pct,
        passed,
        answers,
        weak_areas: [...new Set(weakAreas)],
        status: 'completed',
        attempted_at: new Date().toISOString(),
      }).eq('id', activeTest.id);

      const pts = passed ? 10 : 3;
      const newScore = Math.min(1000, (profile.skill_score||0) + pts);
      await supabase.from('profiles').update({
        skill_score: newScore,
        weak_topics: passed
          ? profile.weak_topics || []
          : [...new Set([...(profile.weak_topics||[]), ...(new Set(weakAreas))])],
        strong_topics: passed
          ? [...new Set([...(profile.strong_topics||[]), profile.domain_id||'general'])]
          : profile.strong_topics || [],
      }).eq('id', profile.id);

      const { data: fresh } = await supabase
        .from('profiles').select('*')
        .eq('id', profile.id).single();
      if (fresh) setProfile(fresh);

    } catch(e) { console.error(e); }
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2,'0')}`;
  };

  const answered = Object.keys(answers).length;
  const urgent = timeLeft < 120;

  // Active test screen
  if (activeTest && !submitted) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto">

          {/* Test header */}
          <div className="flex items-center justify-between mb-5 p-4 rounded-2xl"
            style={{ background:'rgba(10,10,18,0.95)', border:'1px solid rgba(0,255,148,0.15)' }}>
            <div>
              <h2 className="font-bold text-white font-heading text-sm">
                {activeTest.title}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {answered}/{questions.length} answered
                · Pass score: 50%
              </p>
            </div>
            <div className="text-right">
              <div className={`text-2xl font-bold font-heading font-mono ${urgent ? 'text-danger' : 'text-primary'}`}
                style={{
                  textShadow: urgent
                    ? '0 0 10px rgba(255,107,107,0.8)'
                    : '0 0 10px rgba(0,255,148,0.6)',
                }}>
                {formatTime(timeLeft)}
              </div>
              <p className="text-xs text-gray-600">remaining</p>
            </div>
          </div>

          {/* Progress */}
          <div className="h-1 rounded-full mb-5 overflow-hidden"
            style={{ background:'rgba(34,34,51,0.8)' }}>
            <motion.div
              animate={{ width:`${(answered/questions.length)*100}%` }}
              className="h-full rounded-full"
              style={{ background:'linear-gradient(90deg,#00FF94,#7B61FF)' }}
            />
          </div>

          {/* Questions */}
          <div className="space-y-4 mb-5">
            {questions.map((q, qi) => {
              const opts = getOptions(q.options);
              return (
                <motion.div key={qi}
                  initial={{ opacity:0, y:5 }}
                  animate={{ opacity:1, y:0 }}
                  transition={{ delay:qi*0.02 }}
                  className="p-4 rounded-2xl"
                  style={{ background:'rgba(10,10,18,0.9)', border:'1px solid rgba(34,34,51,0.6)' }}>
                  <p className="text-sm font-medium text-white mb-3">
                    <span className="text-primary font-bold mr-2">{qi+1}.</span>
                    {q.question}
                  </p>
                  <div className="grid gap-2">
                    {opts.map((opt, oi) => (
                      <button key={oi}
                        onClick={() => setAnswers(prev => ({ ...prev, [qi]: oi }))}
                        className="flex items-center gap-3 p-3 rounded-xl text-left text-xs transition-all"
                        style={{
                          background: answers[qi] === oi
                            ? 'rgba(0,255,148,0.1)'
                            : 'rgba(18,18,26,0.8)',
                          border:`1px solid ${answers[qi] === oi
                            ? 'rgba(0,255,148,0.4)'
                            : 'rgba(34,34,51,0.5)'}`,
                          boxShadow: answers[qi] === oi
                            ? '0 0 8px rgba(0,255,148,0.1)' : 'none',
                        }}>
                        <span className={`w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-bold ${
                          answers[qi] === oi
                            ? 'bg-primary text-dark-900'
                            : 'bg-dark-600 text-gray-500'
                        }`}>
                          {['A','B','C','D'][oi]}
                        </span>
                        <span className={answers[qi] === oi ? 'text-white' : 'text-gray-400'}>
                          {opt}
                        </span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>

          <button onClick={handleSubmit}
            disabled={answered < questions.length}
            className="w-full py-3.5 rounded-2xl font-bold text-sm transition-all disabled:opacity-40"
            style={{
              background: answered === questions.length
                ? 'linear-gradient(135deg,#00FF94,#7B61FF)'
                : 'rgba(0,255,148,0.05)',
              color:'#050508',
              boxShadow: answered === questions.length
                ? '0 0 25px rgba(0,255,148,0.35)' : 'none',
            }}>
            {answered < questions.length
              ? `Answer all questions (${questions.length - answered} remaining)`
              : 'Submit Test 🎯'}
          </button>
        </div>
      </DashboardLayout>
    );
  }

  // Results screen
  if (submitted && result) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto">

          <motion.div
            initial={{ opacity:0, scale:0.95 }}
            animate={{ opacity:1, scale:1 }}
            className="p-8 rounded-2xl text-center mb-5"
            style={{
              background: result.passed
                ? 'rgba(0,255,148,0.05)'
                : 'rgba(255,107,107,0.05)',
              border:`1px solid ${result.passed
                ? 'rgba(0,255,148,0.25)'
                : 'rgba(255,107,107,0.25)'}`,
            }}>
            <div className="text-5xl mb-3">{result.passed ? '🏆' : '😅'}</div>
            <div className={`text-4xl font-bold font-heading mb-2 ${
              result.passed ? 'text-primary' : 'text-danger'
            }`}
              style={{
                textShadow: result.passed
                  ? '0 0 20px rgba(0,255,148,0.5)'
                  : '0 0 20px rgba(255,107,107,0.5)',
              }}>
              {result.pct}%
            </div>
            <p className={`text-sm font-bold mb-1 ${
              result.passed ? 'text-primary' : 'text-danger'
            }`}>
              {result.passed ? '✅ Passed!' : '❌ Failed — Study and retry'}
            </p>
            <p className="text-xs text-gray-500">
              {result.correct} correct out of {result.total}
              {' · '}{result.passed ? '+10' : '+3'} Genois Score earned
            </p>
          </motion.div>

          {/* Answer review */}
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
            Answer Review
          </h3>
          <div className="space-y-2 mb-5">
            {questions.map((q, qi) => {
              const opts = getOptions(q.options);
              const userIdx = answers[qi];
              const correctIdx = opts.indexOf(q.correct_answer);
              const isCorrect = userIdx === correctIdx;
              return (
                <div key={qi} className="p-3 rounded-xl"
                  style={{
                    background: isCorrect
                      ? 'rgba(0,255,148,0.04)'
                      : 'rgba(255,107,107,0.04)',
                    border:`1px solid ${isCorrect
                      ? 'rgba(0,255,148,0.15)'
                      : 'rgba(255,107,107,0.15)'}`,
                  }}>
                  <div className="flex items-start gap-2">
                    <span className={`text-xs font-bold mt-0.5 flex-shrink-0 ${
                      isCorrect ? 'text-primary' : 'text-danger'
                    }`}>
                      {isCorrect ? '✓' : '✕'}
                    </span>
                    <div>
                      <p className="text-xs text-white mb-1">{q.question}</p>
                      {!isCorrect && (
                        <p className="text-xs text-gray-500 mb-0.5">
                          Your answer:
                          <span className="text-danger ml-1">
                            {opts[userIdx] ?? 'Not answered'}
                          </span>
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
                        Correct:
                        <span className="text-primary ml-1">{q.correct_answer}</span>
                      </p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        💡 {q.explanation}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setActiveTest(null);
                setSubmitted(false);
                setResult(null);
                fetchTests();
              }}
              className="flex-1 py-3 rounded-xl font-bold text-sm transition-all"
              style={{ background:'rgba(10,10,18,0.8)', color:'#666', border:'1px solid rgba(34,34,51,0.5)' }}>
              ← Back to Tests
            </button>
            {!result.passed && (
              <button onClick={() => startTest(activeTest)}
                className="flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                style={{ background:'rgba(255,179,71,0.1)', color:'#FFB347', border:'1px solid rgba(255,179,71,0.3)' }}>
                <RotateCcw size={13}/> Retry Test
              </button>
            )}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Test list screen
  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold font-heading text-white"
              style={{ textShadow:'0 0 15px rgba(0,255,148,0.3)' }}>
              📝 Tests
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Daily · Weekly · Monthly — Track your knowledge
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {Object.entries(TEST_CONFIGS).map(([type, cfg]) => (
              <button key={type}
                onClick={() => generateTest(type)}
                disabled={!!generating}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                style={{
                  background:`${cfg.color}10`,
                  color:cfg.color,
                  border:`1px solid ${cfg.color}30`,
                }}>
                {generating === type ? (
                  <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"/>
                ) : cfg.icon}
                {cfg.label}
              </button>
            ))}
          </div>
        </div>

        {/* Test type cards */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {Object.entries(TEST_CONFIGS).map(([type, cfg]) => (
            <div key={type} className="p-4 rounded-2xl text-center card-hover"
              style={{
                background:`${cfg.color}06`,
                border:`1px solid ${cfg.color}18`,
              }}>
              <div className="text-2xl mb-1">{cfg.icon}</div>
              <p className="text-xs font-bold text-white">{cfg.label}</p>
              <p className="text-xs text-gray-600 mt-0.5">{cfg.desc}</p>
            </div>
          ))}
        </div>

        {/* Tests list */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="h-20 rounded-xl animate-pulse"
                style={{ background:'rgba(18,18,26,0.8)' }}/>
            ))}
          </div>
        ) : tests.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📝</div>
            <h2 className="text-lg font-bold text-white font-heading mb-2">
              No tests yet
            </h2>
            <p className="text-gray-500 text-sm mb-5">
              Generate your first test to start practicing
            </p>
            <button onClick={() => generateTest('daily')}
              disabled={!!generating}
              className="px-5 py-2.5 rounded-xl font-bold text-sm text-dark-900 disabled:opacity-50"
              style={{ background:'#00FF94', boxShadow:'0 0 15px rgba(0,255,148,0.3)' }}>
              Generate Daily Test ⚡
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {tests.map((test, i) => {
              const cfg = TEST_CONFIGS[test.type] || TEST_CONFIGS['daily'];
              const qCount = test.test_questions?.length || 0;
              const isCompleted = test.status === 'completed';
              return (
                <motion.div key={test.id}
                  initial={{ opacity:0, y:5 }}
                  animate={{ opacity:1, y:0 }}
                  transition={{ delay:i*0.03 }}
                  className="flex items-center gap-4 p-4 rounded-2xl card-hover"
                  style={{ background:'rgba(10,10,18,0.9)', border:'1px solid rgba(34,34,51,0.6)' }}>
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                    style={{ background:`${cfg.color}10`, border:`1px solid ${cfg.color}18` }}>
                    {cfg.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      {test.title}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="text-xs px-1.5 py-0.5 rounded-full font-medium capitalize"
                        style={{ background:`${cfg.color}10`, color:cfg.color }}>
                        {test.type}
                      </span>
                      <span className="text-xs text-gray-600 flex items-center gap-1">
                        <Clock size={10}/> {test.time_limit_minutes} min
                      </span>
                      <span className="text-xs text-gray-600">{qCount} questions</span>
                      {isCompleted && (
                        <span className={`text-xs font-bold ${
                          test.passed ? 'text-primary' : 'text-danger'
                        }`}>
                          {test.percentage}% {test.passed ? '✅' : '❌'}
                        </span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => startTest(test)}
                    disabled={qCount === 0}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-30 flex-shrink-0"
                    style={{
                      background:'linear-gradient(135deg,#00FF94,#7B61FF)',
                      color:'#050508',
                      boxShadow:'0 0 10px rgba(0,255,148,0.2)',
                    }}>
                    <Zap size={11}/>
                    {isCompleted ? 'Retry' : 'Start'}
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Tests;
