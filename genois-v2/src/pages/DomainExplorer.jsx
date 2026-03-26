import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import useStore from '../store/useStore';
import { DOMAINS } from '../data/domains';
import toast from 'react-hot-toast';
import Navbar from '../components/layout/Navbar';

const TIMELINES = [
  { id:'daily',   label:'Daily Plan',   icon:'📅', desc:'1 topic per day · 1-2 hours study' },
  { id:'weekly',  label:'Weekly Plan',  icon:'🗓️', desc:'7 topics per week · structured' },
  { id:'monthly', label:'Monthly Plan', icon:'📆', desc:'Complete domain in 30 days' },
];

const LEVELS = [
  { id:'beginner',     label:'Beginner',     icon:'🌱', desc:'Just starting out' },
  { id:'intermediate', label:'Intermediate', icon:'⚡', desc:'Know basics already' },
  { id:'advanced',     label:'Advanced',     icon:'🔥', desc:'Want deep knowledge' },
];

const ROADMAP_DATA = {
  fullstack: [
    { day:1,  title:'HTML Fundamentals',       topic:'HTML',        skills:['HTML5','Semantic HTML','Forms'],         mini_project:'Build a personal bio page',            project_brief:null, video_title:'HTML Full Course - freeCodeCamp', video_url:'https://www.youtube.com/watch?v=pQN-pnXPaVg', video_duration:'2h', article_title:'MDN HTML Guide', article_url:'https://developer.mozilla.org/en-US/docs/Learn/HTML', coding_resource_title:'HTML Practice - W3Schools', coding_resource_url:'https://www.w3schools.com/html/html_exercises.asp' },
    { day:2,  title:'CSS & Flexbox',           topic:'CSS',         skills:['CSS3','Flexbox','Selectors'],            mini_project:'Style bio page with CSS and flexbox',   project_brief:null, video_title:'CSS Full Course - freeCodeCamp', video_url:'https://www.youtube.com/watch?v=OXGznpKZ_sA', video_duration:'2h', article_title:'CSS Tricks Flexbox Guide', article_url:'https://css-tricks.com/snippets/css/a-guide-to-flexbox/', coding_resource_title:'Flexbox Froggy Game', coding_resource_url:'https://flexboxfroggy.com' },
    { day:3,  title:'CSS Grid & Responsive',   topic:'CSS',         skills:['Grid','Media Queries','Mobile'],         mini_project:'Make bio page fully responsive',        project_brief:null, video_title:'CSS Grid Tutorial', video_url:'https://www.youtube.com/watch?v=EiNiSFIPIQE', video_duration:'1h', article_title:'MDN CSS Grid Guide', article_url:'https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Grid_Layout', coding_resource_title:'Grid Garden Game', coding_resource_url:'https://cssgridgarden.com' },
    { day:4,  title:'JavaScript Basics',       topic:'JavaScript',  skills:['Variables','Functions','DOM'],           mini_project:'Add interactivity to your bio page',    project_brief:null, video_title:'JavaScript Full Course - freeCodeCamp', video_url:'https://www.youtube.com/watch?v=PkZNo7MFNFg', video_duration:'3h', article_title:'JavaScript.info - The Modern JS Tutorial', article_url:'https://javascript.info/', coding_resource_title:'JS Exercises - Exercism', coding_resource_url:'https://exercism.org/tracks/javascript' },
    { day:5,  title:'JS Arrays & Objects',     topic:'JavaScript',  skills:['Arrays','Objects','Methods'],            mini_project:'Build a contact list app',              project_brief:null, video_title:'JS Arrays and Objects - Traversy', video_url:'https://www.youtube.com/watch?v=7W4pQQ20nJg', video_duration:'1h', article_title:'MDN Array Methods', article_url:'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array', coding_resource_title:'Array Challenges - freeCodeCamp', coding_resource_url:'https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures/#basic-data-structures' },
    { day:6,  title:'DOM Manipulation',        topic:'JavaScript',  skills:['DOM','Events','querySelector'],          mini_project:'Build interactive todo list',           project_brief:null, video_title:'DOM Manipulation Crash Course', video_url:'https://www.youtube.com/watch?v=0ik6X4DJKCc', video_duration:'1h', article_title:'MDN DOM Introduction', article_url:'https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model/Introduction', coding_resource_title:'DOM Challenges - JavaScript30', coding_resource_url:'https://javascript30.com' },
    { day:7,  title:'Async JS & Fetch API',    topic:'JavaScript',  skills:['Promises','async/await','fetch'],        mini_project:'Fetch weather data from API',           project_brief:'PROJECT 1: Build a Weather App using OpenWeather API. Show city name, temperature, humidity, weather condition. Add search functionality. Deploy on Vercel. Push to GitHub.', video_title:'Async JavaScript Crash Course', video_url:'https://www.youtube.com/watch?v=PoRJizFvM7s', video_duration:'1h', article_title:'MDN Async/Await Guide', article_url:'https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Asynchronous/Promises', coding_resource_title:'Fetch API Practice', coding_resource_url:'https://javascript.info/fetch' },
    { day:8,  title:'React Introduction',      topic:'React',       skills:['React','JSX','Components'],              mini_project:'Create your first React components',    project_brief:null, video_title:'React JS Full Course 2024 - freeCodeCamp', video_url:'https://www.youtube.com/watch?v=CgkZ7MvWUAA', video_duration:'4h', article_title:'React Official Docs - react.dev', article_url:'https://react.dev/learn', coding_resource_title:'React Exercises - Scrimba', coding_resource_url:'https://scrimba.com/learn/learnreact' },
    { day:9,  title:'React Hooks - useState',  topic:'React',       skills:['useState','State','Props'],              mini_project:'Build counter and form with useState',  project_brief:null, video_title:'React Hooks Tutorial - Codevolution', video_url:'https://www.youtube.com/watch?v=cF2lQ_gZeA8', video_duration:'2h', article_title:'React useState Hook - react.dev', article_url:'https://react.dev/reference/react/useState', coding_resource_title:'React State Challenges', coding_resource_url:'https://react.dev/learn/state-a-components-memory' },
    { day:10, title:'React useEffect & APIs',  topic:'React',       skills:['useEffect','API','Lifecycle'],           mini_project:'Build GitHub profile finder app',       project_brief:'PROJECT 2: GitHub Finder App. Search any GitHub username. Show profile, repos, followers, following. Use GitHub public API. Style it well. Deploy on Vercel.', video_title:'useEffect Hook Tutorial', video_url:'https://www.youtube.com/watch?v=gv9ugDJ1ynU', video_duration:'1h', article_title:'useEffect - react.dev', article_url:'https://react.dev/reference/react/useEffect', coding_resource_title:'GitHub API Docs', coding_resource_url:'https://docs.github.com/en/rest' },
    { day:11, title:'Node.js Fundamentals',    topic:'Node.js',     skills:['Node.js','NPM','Modules'],               mini_project:'Build a CLI calculator tool',           project_brief:null, video_title:'Node.js Crash Course - Traversy Media', video_url:'https://www.youtube.com/watch?v=fBNz5xF-Kx4', video_duration:'1.5h', article_title:'Node.js Official Docs', article_url:'https://nodejs.org/en/docs/', coding_resource_title:'Node.js Exercises - NodeSchool', coding_resource_url:'https://nodeschool.io' },
    { day:12, title:'Express REST APIs',       topic:'Node.js',     skills:['Express','REST','Routes'],               mini_project:'Build Notes CRUD REST API',             project_brief:null, video_title:'Express JS Crash Course - Traversy', video_url:'https://www.youtube.com/watch?v=SccSCuHhOw0', video_duration:'1h', article_title:'Express.js Official Guide', article_url:'https://expressjs.com/en/guide/routing.html', coding_resource_title:'REST API Design Guide', coding_resource_url:'https://restfulapi.net' },
    { day:13, title:'MongoDB & Mongoose',      topic:'Database',    skills:['MongoDB','Mongoose','CRUD'],             mini_project:'Connect Notes API to MongoDB',          project_brief:null, video_title:'MongoDB Crash Course - Traversy', video_url:'https://www.youtube.com/watch?v=-56x56UppqQ', video_duration:'1.5h', article_title:'MongoDB University Free Course', article_url:'https://university.mongodb.com', coding_resource_title:'Mongoose Official Docs', coding_resource_url:'https://mongoosejs.com/docs/' },
    { day:14, title:'JWT Authentication',      topic:'Security',    skills:['JWT','Auth','bcrypt'],                   mini_project:'Add login/register to Notes app',       project_brief:null, video_title:'JWT Auth Tutorial - Traversy', video_url:'https://www.youtube.com/watch?v=mbsmsi7l3r4', video_duration:'1h', article_title:'JWT.io Introduction', article_url:'https://jwt.io/introduction/', coding_resource_title:'Auth Best Practices - OWASP', coding_resource_url:'https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html' },
    { day:15, title:'Deploy Full Stack App',   topic:'DevOps',      skills:['Vercel','Railway','CI/CD'],              mini_project:'Deploy your full stack app live',       project_brief:'PROJECT 3: Full Stack Job Board App. Companies post jobs, students apply. Features: Auth, CRUD, search, filter by role/location. Deploy frontend on Vercel, backend on Railway. This is your portfolio project.', video_title:'Deploy Node.js App - Railway Tutorial', video_url:'https://www.youtube.com/watch?v=MusIvEKjqsc', video_duration:'30min', article_title:'Vercel Deployment Guide', article_url:'https://vercel.com/docs/deployments/overview', coding_resource_title:'Railway.app Docs', coding_resource_url:'https://docs.railway.app' },
  ],
  cybersecurity: [
    { day:1,  title:'Networking Fundamentals', topic:'Networking',  skills:['TCP/IP','DNS','HTTP','OSI'],             mini_project:'Analyze network with Wireshark',        project_brief:null, video_title:'Networking Full Course - freeCodeCamp', video_url:'https://www.youtube.com/watch?v=IPvYjXCsTg8', video_duration:'2h', article_title:'Networking Basics - Cisco', article_url:'https://www.cisco.com/c/en/us/solutions/small-business/resource-center/networking/networking-basics.html', coding_resource_title:'Wireshark Tutorial', coding_resource_url:'https://www.wireshark.org/docs/wsug_html_chunked/' },
    { day:2,  title:'Linux Command Line',      topic:'Linux',       skills:['Linux','Bash','Permissions'],            mini_project:'Complete OverTheWire Bandit 1-5',       project_brief:null, video_title:'Linux Command Line Full Course', video_url:'https://www.youtube.com/watch?v=sWbUDq4S6Y8', video_duration:'2h', article_title:'Linux Journey - Free Learning', article_url:'https://linuxjourney.com', coding_resource_title:'OverTheWire Bandit Wargame', coding_resource_url:'https://overthewire.org/wargames/bandit/' },
    { day:3,  title:'Python for Security',     topic:'Python',      skills:['Python','Scripting','Socket'],           mini_project:'Build a port scanner in Python',        project_brief:null, video_title:'Python Ethical Hacking - freeCodeCamp', video_url:'https://www.youtube.com/watch?v=FD0A9KxeJMQ', video_duration:'2h', article_title:'Python for Security - Real Python', article_url:'https://realpython.com/python-security/', coding_resource_title:'Python Security Scripts - GitHub', coding_resource_url:'https://github.com/topics/python-security' },
    { day:4,  title:'Web Security & OWASP',    topic:'Web Security',skills:['OWASP','XSS','CSRF','SQLi'],            mini_project:'Find vulnerabilities in DVWA',          project_brief:'PROJECT 1: Vulnerability Assessment Report. Set up DVWA locally. Find and document all OWASP Top 10 vulnerabilities. Write professional security report with severity ratings, proof of concept, and remediation steps.', video_title:'OWASP Top 10 Explained', video_url:'https://www.youtube.com/watch?v=KAOcMeMoQ64', video_duration:'2h', article_title:'OWASP Top 10 Official', article_url:'https://owasp.org/www-project-top-ten/', coding_resource_title:'DVWA Setup Guide', coding_resource_url:'https://github.com/digininja/DVWA' },
    { day:5,  title:'Penetration Testing',     topic:'PenTest',     skills:['Nmap','Burp Suite','Metasploit'],        mini_project:'Complete HackTheBox easy machine',      project_brief:null, video_title:'Penetration Testing Full Course', video_url:'https://www.youtube.com/watch?v=3Kq1MIfTWCE', video_duration:'3h', article_title:'PenTest Standard Guide', article_url:'http://www.pentest-standard.org/index.php/Main_Page', coding_resource_title:'HackTheBox Practice', coding_resource_url:'https://www.hackthebox.com' },
    { day:6,  title:'Cryptography',            topic:'Crypto',      skills:['AES','RSA','Hashing','TLS'],             mini_project:'Implement encryption in Python',        project_brief:null, video_title:'Cryptography for Beginners', video_url:'https://www.youtube.com/watch?v=AQDCe585Lnc', video_duration:'2h', article_title:'Practical Cryptography Guide', article_url:'https://cryptobook.nakov.com', coding_resource_title:'CryptoPals Challenges', coding_resource_url:'https://cryptopals.com' },
    { day:7,  title:'CTF & Bug Bounty',        topic:'CTF',         skills:['CTF','Bug Bounty','Reports'],            mini_project:'Solve 3 PicoCTF challenges',            project_brief:'PROJECT 2: Bug Bounty Report. Participate in a beginner-friendly bug bounty program (HackerOne or Bugcrowd). Find a valid vulnerability. Write professional report with steps to reproduce, impact analysis, and remediation advice.', video_title:'CTF Guide for Beginners', video_url:'https://www.youtube.com/watch?v=8ev9ZX9J45A', video_duration:'1h', article_title:'Bug Bounty Hunting Guide - HackerOne', article_url:'https://docs.hackerone.com/en/articles/8494488-bug-bounty-101', coding_resource_title:'PicoCTF Practice', coding_resource_url:'https://picoctf.org' },
  ],
  dsa: [
    { day:1,  title:'Arrays & Big O',          topic:'Arrays',      skills:['Arrays','Big O','Space Complexity'],     mini_project:'Solve 5 LeetCode Easy array problems',  project_brief:null, video_title:'Arrays - Abdul Bari', video_url:'https://www.youtube.com/watch?v=3OamzN90kPg', video_duration:'2h', article_title:'Big O Notation Guide', article_url:'https://www.freecodecamp.org/news/big-o-notation-why-it-matters-and-why-it-doesnt-1674169ae6d6/', coding_resource_title:'LeetCode Array Problems', coding_resource_url:'https://leetcode.com/tag/array/' },
    { day:2,  title:'Two Pointer',             topic:'Arrays',      skills:['Two Pointer','Sliding Window'],          mini_project:'Two Sum, Valid Palindrome',             project_brief:null, video_title:'Two Pointer Technique - NeetCode', video_url:'https://www.youtube.com/watch?v=0l2nePjDFuA', video_duration:'1h', article_title:'Two Pointer Pattern Guide', article_url:'https://leetcode.com/discuss/study-guide/1688903/Solved-all-two-pointers-problems-in-100-days', coding_resource_title:'Two Pointer Problems - LeetCode', coding_resource_url:'https://leetcode.com/tag/two-pointers/' },
    { day:3,  title:'Sliding Window',          topic:'Arrays',      skills:['Sliding Window','Subarray'],             mini_project:'Max Subarray, Buy/Sell Stock',          project_brief:null, video_title:'Sliding Window - NeetCode', video_url:'https://www.youtube.com/watch?v=EHCGAZBbB88', video_duration:'1h', article_title:'Sliding Window Pattern', article_url:'https://leetcode.com/discuss/study-guide/1773891/Sliding-Window-Technique-and-Question-Bank', coding_resource_title:'Sliding Window Practice', coding_resource_url:'https://leetcode.com/tag/sliding-window/' },
    { day:4,  title:'HashMap & HashSet',       topic:'Hashing',     skills:['HashMap','HashSet','Frequency'],         mini_project:'Group Anagrams, Valid Anagram',         project_brief:'PROJECT 1: Algorithm Visualizer. Animate Bubble Sort, Merge Sort, Quick Sort step by step. Show comparisons and swaps. Color code sorted elements. Build with React and CSS animations.', video_title:'HashMap Problems - NeetCode', video_url:'https://www.youtube.com/watch?v=UrZ3LvdtL_k', video_duration:'1h', article_title:'Hashing Data Structure Guide', article_url:'https://www.geeksforgeeks.org/hashing-data-structure/', coding_resource_title:'Hashing Problems - LeetCode', coding_resource_url:'https://leetcode.com/tag/hash-table/' },
    { day:5,  title:'Linked Lists',            topic:'LinkedList',  skills:['Linked List','Reversal','Floyd Cycle'],  mini_project:'Implement LinkedList, reverse it',      project_brief:null, video_title:'Linked Lists - Striver', video_url:'https://www.youtube.com/watch?v=Ast5sKgXXtg', video_duration:'2h', article_title:'Linked List Complete Guide - GFG', article_url:'https://www.geeksforgeeks.org/data-structures/linked-list/', coding_resource_title:'LinkedList Problems - LeetCode', coding_resource_url:'https://leetcode.com/tag/linked-list/' },
    { day:6,  title:'Stacks & Queues',         topic:'Stack',       skills:['Stack','Queue','Monotonic Stack'],       mini_project:'Valid Parentheses, Min Stack',          project_brief:null, video_title:'Stack and Queue - Striver', video_url:'https://www.youtube.com/watch?v=GYptUgnIM_I', video_duration:'1.5h', article_title:'Stack Data Structure - GFG', article_url:'https://www.geeksforgeeks.org/stack-data-structure/', coding_resource_title:'Stack Problems - LeetCode', coding_resource_url:'https://leetcode.com/tag/stack/' },
    { day:7,  title:'Binary Trees',            topic:'Trees',       skills:['Binary Tree','DFS','BFS','Traversal'],   mini_project:'All traversals, max depth',             project_brief:'PROJECT 2: Data Structures Visualizer. Visualize BST insert, delete, search operations with step by step animation. Show tree structure updating in real time. Include time complexity display.', video_title:'Binary Trees - Striver Full Series', video_url:'https://www.youtube.com/watch?v=_ANrF3FJm7I', video_duration:'3h', article_title:'Binary Tree GFG Guide', article_url:'https://www.geeksforgeeks.org/binary-tree-data-structure/', coding_resource_title:'Tree Problems - LeetCode', coding_resource_url:'https://leetcode.com/tag/binary-tree/' },
    { day:8,  title:'Graphs BFS & DFS',        topic:'Graphs',      skills:['Graph','BFS','DFS','Adjacency List'],    mini_project:'Number of Islands, Clone Graph',        project_brief:null, video_title:'Graph Series - Striver', video_url:'https://www.youtube.com/watch?v=YTtpfjkUrvE', video_duration:'4h', article_title:'Graph Data Structure Guide', article_url:'https://www.geeksforgeeks.org/graph-data-structure-and-algorithms/', coding_resource_title:'Graph Problems - LeetCode', coding_resource_url:'https://leetcode.com/tag/graph/' },
    { day:9,  title:'Dynamic Programming',     topic:'DP',          skills:['DP','Memoization','Tabulation'],         mini_project:'Climbing Stairs, House Robber, Coin Change', project_brief:null, video_title:'DP Series - Striver', video_url:'https://www.youtube.com/watch?v=FfXoiwwnxFw', video_duration:'5h', article_title:'DP Patterns Guide', article_url:'https://leetcode.com/discuss/study-guide/458695/Dynamic-Programming-Patterns', coding_resource_title:'DP Problems - LeetCode', coding_resource_url:'https://leetcode.com/tag/dynamic-programming/' },
    { day:10, title:'Mock Interview Practice', topic:'Interview',   skills:['Problem Solving','Communication'],       mini_project:'3 medium problems in 90 minutes',      project_brief:'PROJECT 3: LeetCode Progress Tracker. Track your solved problems by difficulty and topic. Show daily streak, weekly goals, progress charts, and weak areas. Connect to LeetCode public GraphQL API.', video_title:'Mock Interview Tips - CS Dojo', video_url:'https://www.youtube.com/watch?v=qc1owf2-ovU', video_duration:'30min', article_title:'Striver SDE Sheet', article_url:'https://takeuforward.org/interviews/strivers-sde-sheet-top-coding-interview-problems/', coding_resource_title:'Pramp Free Mock Interviews', coding_resource_url:'https://www.pramp.com' },
  ],
  aiml: [
    { day:1,  title:'Python for Data Science', topic:'Python',      skills:['Python','NumPy','Pandas'],               mini_project:'Analyze student dataset with Pandas',   project_brief:null, video_title:'Python Full Course - freeCodeCamp', video_url:'https://www.youtube.com/watch?v=eWRfhZUzrAc', video_duration:'4h', article_title:'Python NumPy Tutorial - W3Schools', article_url:'https://www.w3schools.com/python/numpy/', coding_resource_title:'Pandas Exercises - Kaggle', coding_resource_url:'https://www.kaggle.com/learn/pandas' },
    { day:2,  title:'Statistics & Probability',topic:'Statistics',  skills:['Mean','Variance','Distributions'],       mini_project:'Statistical analysis on real dataset',  project_brief:null, video_title:'Statistics for ML - StatQuest', video_url:'https://www.youtube.com/watch?v=xxpc-HPKN28', video_duration:'2h', article_title:'Statistics for Data Science Guide', article_url:'https://www.kdnuggets.com/2021/09/statistics-data-science.html', coding_resource_title:'Stats Exercises - Khan Academy', coding_resource_url:'https://www.khanacademy.org/math/statistics-probability' },
    { day:3,  title:'Data Visualization',      topic:'DataViz',     skills:['Matplotlib','Seaborn','Plotly'],         mini_project:'Visualize sales data with 5 chart types',project_brief:null, video_title:'Matplotlib Tutorial - Corey Schafer', video_url:'https://www.youtube.com/watch?v=UO98lJQ3QGI', video_duration:'1h', article_title:'Seaborn Official Gallery', article_url:'https://seaborn.pydata.org/examples/index.html', coding_resource_title:'Data Visualization - Kaggle', coding_resource_url:'https://www.kaggle.com/learn/data-visualization' },
    { day:4,  title:'ML Fundamentals',         topic:'ML',          skills:['Supervised','Features','Train Test'],    mini_project:'Train first ML model on Titanic',       project_brief:'PROJECT 1: Student Grade Predictor. Predict final exam grade based on attendance, assignment scores, and test scores. Use Linear Regression with Scikit-learn. Build Streamlit web app. Deploy on HuggingFace Spaces.', video_title:'ML Crash Course - Google', video_url:'https://www.youtube.com/watch?v=GwIo3gDZCVQ', video_duration:'2h', article_title:'Scikit-learn User Guide', article_url:'https://scikit-learn.org/stable/user_guide.html', coding_resource_title:'ML Exercises - Kaggle', coding_resource_url:'https://www.kaggle.com/learn/intro-to-machine-learning' },
    { day:5,  title:'Regression & Classification',topic:'ML',       skills:['Linear Reg','Logistic','Sklearn'],       mini_project:'Predict house prices with features',    project_brief:null, video_title:'Sklearn Tutorial - Sentdex', video_url:'https://www.youtube.com/watch?v=0Lt9w-BxKFQ', video_duration:'2h', article_title:'Logistic Regression Guide - GFG', article_url:'https://www.geeksforgeeks.org/understanding-logistic-regression/', coding_resource_title:'ML Course - fast.ai', coding_resource_url:'https://course.fast.ai' },
    { day:6,  title:'Neural Networks',         topic:'DL',          skills:['Perceptron','Layers','Backprop'],        mini_project:'Build XOR solver neural network',       project_brief:null, video_title:'Neural Networks from Scratch - 3Blue1Brown', video_url:'https://www.youtube.com/watch?v=aircAruvnKk', video_duration:'2h', article_title:'Neural Networks and Deep Learning - Free Book', article_url:'http://neuralnetworksanddeeplearning.com', coding_resource_title:'NN Playground - TensorFlow', coding_resource_url:'https://playground.tensorflow.org' },
    { day:7,  title:'Deep Learning PyTorch',   topic:'DL',          skills:['PyTorch','Tensors','Training'],          mini_project:'Train MNIST digit classifier 99%',      project_brief:'PROJECT 2: Image Classifier Web App. User uploads any image, AI classifies it. Use pre-trained ResNet50 model. Build with Streamlit or Gradio. Deploy on HuggingFace Spaces for free.', video_title:'PyTorch Full Course - Daniel Bourke', video_url:'https://www.youtube.com/watch?v=c36lUUr864M', video_duration:'3h', article_title:'PyTorch Official Tutorials', article_url:'https://pytorch.org/tutorials/', coding_resource_title:'Deep Learning - fast.ai', coding_resource_url:'https://course.fast.ai' },
    { day:8,  title:'NLP & Transformers',      topic:'NLP',         skills:['NLP','BERT','HuggingFace'],              mini_project:'Build tweet sentiment analyzer',        project_brief:null, video_title:'NLP with Transformers - HuggingFace', video_url:'https://www.youtube.com/watch?v=X2vAabgKiuM', video_duration:'2h', article_title:'HuggingFace NLP Course - Free', article_url:'https://huggingface.co/learn/nlp-course/chapter1/1', coding_resource_title:'HuggingFace Model Hub', coding_resource_url:'https://huggingface.co/models' },
    { day:9,  title:'LLMs & RAG Systems',      topic:'AI',          skills:['RAG','LangChain','Vector DB'],           mini_project:'Build PDF Q&A chatbot with RAG',        project_brief:'PROJECT 3: AI Study Assistant. Student uploads their notes PDF. They can ask questions. AI answers using the PDF content. Use RAG with LangChain + ChromaDB + Gemini API. This is your showpiece project for portfolio.', video_title:'RAG Tutorial - LangChain', video_url:'https://www.youtube.com/watch?v=sVcwVQRHIc8', video_duration:'2h', article_title:'LangChain RAG Documentation', article_url:'https://python.langchain.com/docs/use_cases/question_answering/', coding_resource_title:'ChromaDB Docs', coding_resource_url:'https://docs.trychroma.com' },
    { day:10, title:'MLOps & Deployment',      topic:'MLOps',       skills:['FastAPI','Docker','Monitoring'],         mini_project:'Deploy ML model as REST API',           project_brief:null, video_title:'FastAPI for ML - Sebastián Ramírez', video_url:'https://www.youtube.com/watch?v=GN5T_5rE1jo', video_duration:'1h', article_title:'MLOps Guide - Google', article_url:'https://cloud.google.com/architecture/mlops-continuous-delivery-and-automation-pipelines-in-machine-learning', coding_resource_title:'FastAPI Official Docs', coding_resource_url:'https://fastapi.tiangolo.com' },
  ],
  devops: [
    { day:1,  title:'Linux & Shell Scripting', topic:'Linux',       skills:['Linux','Bash','Cron','Shell'],           mini_project:'Write 5 automation bash scripts',       project_brief:null, video_title:'Linux Full Course - freeCodeCamp', video_url:'https://www.youtube.com/watch?v=sWbUDq4S6Y8', video_duration:'2h', article_title:'Bash Scripting Tutorial', article_url:'https://www.shellscript.sh', coding_resource_title:'Linux Exercises - OverTheWire', coding_resource_url:'https://overthewire.org/wargames/bandit/' },
    { day:2,  title:'Git & GitHub',            topic:'Git',         skills:['Git','Branching','PR','Rebase'],         mini_project:'Setup proper git workflow',             project_brief:null, video_title:'Git Full Course - freeCodeCamp', video_url:'https://www.youtube.com/watch?v=RGOj5yH7evk', video_duration:'2h', article_title:'Pro Git Book - Free', article_url:'https://git-scm.com/book/en/v2', coding_resource_title:'Learn Git Branching - Interactive', coding_resource_url:'https://learngitbranching.js.org' },
    { day:3,  title:'Docker & Containers',     topic:'Docker',      skills:['Docker','Images','Volumes','Compose'],   mini_project:'Dockerize a Node.js application',       project_brief:null, video_title:'Docker Tutorial - TechWorld with Nana', video_url:'https://www.youtube.com/watch?v=fqMOX6JJhGo', video_duration:'2h', article_title:'Docker Official Get Started Guide', article_url:'https://docs.docker.com/get-started/', coding_resource_title:'Play with Docker - Free Lab', coding_resource_url:'https://labs.play-with-docker.com' },
    { day:4,  title:'Kubernetes',              topic:'K8s',         skills:['K8s','Pods','Services','Deployments'],   mini_project:'Deploy app on local K8s cluster',       project_brief:'PROJECT 1: Containerized Microservices App. Build 3 microservices (API Gateway, User Service, Product Service). Containerize with Docker. Orchestrate with Docker Compose. Push all images to DockerHub. Write complete README.', video_title:'Kubernetes Full Course - TechWorld with Nana', video_url:'https://www.youtube.com/watch?v=X48VuDVv0do', video_duration:'4h', article_title:'Kubernetes Official Tutorials', article_url:'https://kubernetes.io/docs/tutorials/', coding_resource_title:'Katacoda K8s Labs - Free', coding_resource_url:'https://www.katacoda.com/courses/kubernetes' },
    { day:5,  title:'AWS Core Services',       topic:'AWS',         skills:['EC2','S3','RDS','Lambda','IAM'],         mini_project:'Host static site on S3 + CloudFront',   project_brief:null, video_title:'AWS Full Course - freeCodeCamp', video_url:'https://www.youtube.com/watch?v=NhDYbskXRgc', video_duration:'3h', article_title:'AWS Documentation', article_url:'https://docs.aws.amazon.com', coding_resource_title:'AWS Free Tier Labs', coding_resource_url:'https://aws.amazon.com/free/' },
    { day:6,  title:'CI/CD Pipelines',         topic:'CI/CD',       skills:['GitHub Actions','Jenkins','YAML'],       mini_project:'Setup auto-deploy pipeline',            project_brief:null, video_title:'GitHub Actions Tutorial - TechWorld', video_url:'https://www.youtube.com/watch?v=R8_veQiYBjI', video_duration:'1h', article_title:'GitHub Actions Docs', article_url:'https://docs.github.com/en/actions', coding_resource_title:'GitHub Actions Examples', coding_resource_url:'https://github.com/actions/starter-workflows' },
    { day:7,  title:'Infrastructure as Code',  topic:'IaC',         skills:['Terraform','Ansible','Pulumi'],          mini_project:'Provision AWS infra with Terraform',    project_brief:'PROJECT 2: Full DevOps Pipeline. App code on GitHub triggers GitHub Actions. Actions builds Docker image. Pushes to DockerHub. Deploys to AWS EC2. Full automated CI/CD with monitoring using Prometheus and Grafana.', video_title:'Terraform Tutorial - TechWorld with Nana', video_url:'https://www.youtube.com/watch?v=SLB_c_ayRMo', video_duration:'2h', article_title:'Terraform Official Docs', article_url:'https://developer.hashicorp.com/terraform/docs', coding_resource_title:'Terraform Exercises - HashiCorp Learn', coding_resource_url:'https://developer.hashicorp.com/terraform/tutorials' },
  ],
  android: [
    { day:1,  title:'Kotlin Fundamentals',     topic:'Kotlin',      skills:['Kotlin','Null Safety','Classes'],        mini_project:'Build working Kotlin calculator',       project_brief:null, video_title:'Kotlin Full Course - freeCodeCamp', video_url:'https://www.youtube.com/watch?v=F9UC9DY-vIU', video_duration:'2.5h', article_title:'Kotlin Official Docs', article_url:'https://kotlinlang.org/docs/home.html', coding_resource_title:'Kotlin Koans - Practice', coding_resource_url:'https://kotlinlang.org/docs/koans.html' },
    { day:2,  title:'Jetpack Compose',         topic:'Compose',     skills:['Compose','State','Composables'],         mini_project:'Build counter app in Compose',          project_brief:null, video_title:'Jetpack Compose Course - Philip Lackner', video_url:'https://www.youtube.com/watch?v=cDabx3SjuOY', video_duration:'2h', article_title:'Compose Official Docs', article_url:'https://developer.android.com/jetpack/compose/documentation', coding_resource_title:'Compose Pathway - Google', coding_resource_url:'https://developer.android.com/courses/jetpack-compose/course' },
    { day:3,  title:'Navigation & MVVM',       topic:'Architecture',skills:['Navigation','ViewModel','MVVM'],         mini_project:'Build multi-screen notes app',          project_brief:null, video_title:'Android Navigation - Philip Lackner', video_url:'https://www.youtube.com/watch?v=IEO2X5IM1cI', video_duration:'1.5h', article_title:'Guide to App Architecture - Google', article_url:'https://developer.android.com/topic/architecture', coding_resource_title:'MVVM Tutorial - CodingWithMitch', coding_resource_url:'https://codingwithmitch.com/courses/android-mvvm-architecture/' },
    { day:4,  title:'Room Database',           topic:'Database',    skills:['Room','DAO','Entity','SQLite'],           mini_project:'Notes app with Room database',          project_brief:'PROJECT 1: Task Manager App. Create, edit, delete tasks with priority levels. Room database for local storage. Material Design 3 UI. Reminders with AlarmManager. Publish to Play Store internal testing track.', video_title:'Room Database Tutorial - Philip Lackner', video_url:'https://www.youtube.com/watch?v=bOd3wO0uFr8', video_duration:'1.5h', article_title:'Room Database Official Guide', article_url:'https://developer.android.com/training/data-storage/room', coding_resource_title:'Room Codelab - Google', coding_resource_url:'https://developer.android.com/codelabs/android-room-with-a-view-kotlin' },
    { day:5,  title:'Retrofit & Networking',   topic:'Networking',  skills:['Retrofit','OkHttp','Coroutines'],        mini_project:'Build live news reader app',            project_brief:null, video_title:'Retrofit Tutorial - Philip Lackner', video_url:'https://www.youtube.com/watch?v=k2N3EoZI3eU', video_duration:'1.5h', article_title:'Retrofit Official Docs', article_url:'https://square.github.io/retrofit/', coding_resource_title:'NewsAPI for Practice', coding_resource_url:'https://newsapi.org' },
    { day:6,  title:'Firebase Integration',    topic:'Firebase',    skills:['Firebase','Firestore','Auth','FCM'],      mini_project:'Add Firebase auth + realtime db',       project_brief:null, video_title:'Firebase Android - Philip Lackner', video_url:'https://www.youtube.com/watch?v=jbHfJpoOzkI', video_duration:'2h', article_title:'Firebase Android Docs', article_url:'https://firebase.google.com/docs/android/setup', coding_resource_title:'Firebase Codelab - Google', coding_resource_url:'https://firebase.google.com/codelabs/firebase-android' },
    { day:7,  title:'Publish to Play Store',   topic:'Publishing',  skills:['Play Console','APK','Release'],          mini_project:'Publish first app to Play Store',       project_brief:'PROJECT 2: Social Learning App. Students post their daily learning progress. Others can like and comment. Firebase Firestore for real-time data. Firebase Auth for login. Firebase Storage for profile pictures. This is your main Android portfolio app.', video_title:'Publish to Play Store - Step by Step', video_url:'https://www.youtube.com/watch?v=3E_FOJLLMGM', video_duration:'1h', article_title:'Play Store Launch Checklist', article_url:'https://developer.android.com/distribute/best-practices/launch/launch-checklist', coding_resource_title:'Play Console Help', coding_resource_url:'https://support.google.com/googleplay/android-developer/' },
  ],
  datascience: [
    { day:1,  title:'Python & Pandas',         topic:'Python',      skills:['Python','Pandas','NumPy'],               mini_project:'Analyze COVID-19 dataset',              project_brief:null, video_title:'Pandas Tutorial - Corey Schafer', video_url:'https://www.youtube.com/watch?v=vmEHCJofslg', video_duration:'2h', article_title:'10 Minutes to Pandas - Official', article_url:'https://pandas.pydata.org/docs/user_guide/10min.html', coding_resource_title:'Pandas Exercises - Kaggle', coding_resource_url:'https://www.kaggle.com/learn/pandas' },
    { day:2,  title:'SQL for Data Science',    topic:'SQL',         skills:['SQL','Joins','Aggregation','Subquery'],   mini_project:'Query and analyze sales database',      project_brief:null, video_title:'SQL Full Course - freeCodeCamp', video_url:'https://www.youtube.com/watch?v=HXV3zeQKqGY', video_duration:'4h', article_title:'Mode SQL Tutorial - Free', article_url:'https://mode.com/sql-tutorial/', coding_resource_title:'SQL Practice - HackerRank', coding_resource_url:'https://www.hackerrank.com/domains/sql' },
    { day:3,  title:'Data Cleaning & EDA',     topic:'Data',        skills:['Missing Data','Outliers','EDA'],          mini_project:'Clean and explore messy dataset',       project_brief:null, video_title:'EDA Tutorial - Alex The Analyst', video_url:'https://www.youtube.com/watch?v=KdmPHEnPJPs', video_duration:'1h', article_title:'Exploratory Data Analysis Guide', article_url:'https://towardsdatascience.com/exploratory-data-analysis-8fc1cb20fd15', coding_resource_title:'EDA Practice - Kaggle', coding_resource_url:'https://www.kaggle.com/learn/data-cleaning' },
    { day:4,  title:'Statistics for DS',       topic:'Statistics',  skills:['Stats','Hypothesis','A/B Test'],          mini_project:'Run A/B test on website data',          project_brief:'PROJECT 1: Interactive Sales Analytics Dashboard. Connect to a sales CSV dataset. Build interactive Streamlit dashboard with filters, KPI cards, trend charts, and geographic maps. Deploy on Streamlit Cloud for free.', video_title:'Statistics for Data Science - StatQuest', video_url:'https://www.youtube.com/watch?v=xxpc-HPKN28', video_duration:'2h', article_title:'Practical Statistics for DS - Free PDF', article_url:'https://www.oreilly.com/library/view/practical-statistics-for/9781492072935/', coding_resource_title:'Statistics - Khan Academy', coding_resource_url:'https://www.khanacademy.org/math/statistics-probability' },
    { day:5,  title:'Data Visualization',      topic:'Viz',         skills:['Matplotlib','Seaborn','Plotly','Tableau'],mini_project:'Build 10 different chart types',        project_brief:null, video_title:'Plotly Dash Tutorial - Charming Data', video_url:'https://www.youtube.com/watch?v=UO98lJQ3QGI', video_duration:'1h', article_title:'Plotly Python Docs', article_url:'https://plotly.com/python/', coding_resource_title:'Data Viz - Kaggle', coding_resource_url:'https://www.kaggle.com/learn/data-visualization' },
    { day:6,  title:'Machine Learning for DS', topic:'ML',          skills:['Sklearn','Classification','Clustering'],  mini_project:'Predict customer churn',                project_brief:null, video_title:'ML for Data Scientists - Krish Naik', video_url:'https://www.youtube.com/watch?v=GwIo3gDZCVQ', video_duration:'2h', article_title:'Scikit-learn Tutorials', article_url:'https://scikit-learn.org/stable/tutorial/index.html', coding_resource_title:'ML Course - Kaggle', coding_resource_url:'https://www.kaggle.com/learn/intro-to-machine-learning' },
    { day:7,  title:'Business Intelligence',   topic:'BI',          skills:['Power BI','Tableau','Reports','KPIs'],    mini_project:'Build BI report for business data',     project_brief:'PROJECT 2: End-to-End Data Pipeline Project. Scrape data from a website using BeautifulSoup. Clean and process with Pandas. Store in SQLite database. Build Streamlit dashboard showing insights. Present findings as a data story with charts and narrative.', video_title:'Power BI Full Course - freeCodeCamp', video_url:'https://www.youtube.com/watch?v=AGrl-H87pRU', video_duration:'2h', article_title:'Power BI Docs - Microsoft', article_url:'https://docs.microsoft.com/en-us/power-bi/', coding_resource_title:'Tableau Public - Free', coding_resource_url:'https://public.tableau.com' },
  ],
  blockchain: [
    { day:1,  title:'Blockchain Fundamentals', topic:'Blockchain',  skills:['Blockchain','Consensus','Crypto'],       mini_project:'Implement blockchain in Python',        project_brief:null, video_title:'Blockchain Full Course - freeCodeCamp', video_url:'https://www.youtube.com/watch?v=SSo_EIwHSd4', video_duration:'2h', article_title:'Bitcoin Whitepaper - Original', article_url:'https://bitcoin.org/bitcoin.pdf', coding_resource_title:'Blockchain Demo - Interactive', coding_resource_url:'https://andersbrownworth.com/blockchain/' },
    { day:2,  title:'Solidity Basics',         topic:'Solidity',    skills:['Solidity','Smart Contracts','EVM'],      mini_project:'Write and deploy first contract',       project_brief:null, video_title:'Solidity Tutorial - freeCodeCamp', video_url:'https://www.youtube.com/watch?v=ipwxYa-F1uY', video_duration:'2h', article_title:'Solidity Official Docs', article_url:'https://docs.soliditylang.org/', coding_resource_title:'CryptoZombies - Learn Solidity', coding_resource_url:'https://cryptozombies.io' },
    { day:3,  title:'Hardhat & Testing',       topic:'Dev Tools',   skills:['Hardhat','Ethers.js','Testing'],         mini_project:'Deploy contract on testnet',            project_brief:null, video_title:'Hardhat Tutorial - Patrick Collins', video_url:'https://www.youtube.com/watch?v=9Qpi80dQsGU', video_duration:'1.5h', article_title:'Hardhat Official Docs', article_url:'https://hardhat.org/docs', coding_resource_title:'Hardhat Sample Project', coding_resource_url:'https://hardhat.org/tutorial' },
    { day:4,  title:'DeFi & Token Standards',  topic:'DeFi',        skills:['ERC20','ERC721','DeFi','Uniswap'],       mini_project:'Create and deploy ERC20 token',         project_brief:'PROJECT 1: DeFi Token Launch. Create a custom ERC20 token with tokenomics. Deploy on Goerli testnet. Build a simple web3 frontend to show token balance and transfer. Document everything on GitHub.', video_title:'DeFi Development - Patrick Collins', video_url:'https://www.youtube.com/watch?v=M576WGiDBdQ', video_duration:'2h', article_title:'OpenZeppelin ERC20 Docs', article_url:'https://docs.openzeppelin.com/contracts/4.x/erc20', coding_resource_title:'OpenZeppelin Contracts', coding_resource_url:'https://docs.openzeppelin.com/contracts/' },
    { day:5,  title:'Web3 Frontend',           topic:'Web3',        skills:['ethers.js','wagmi','MetaMask','RainbowKit'],mini_project:'Connect MetaMask wallet to dApp',     project_brief:null, video_title:'Web3 Frontend - React + Ethers.js', video_url:'https://www.youtube.com/watch?v=a0osIaAOFSE', video_duration:'1.5h', article_title:'ethers.js Docs', article_url:'https://docs.ethers.org/', coding_resource_title:'wagmi React Hooks for Web3', coding_resource_url:'https://wagmi.sh' },
    { day:6,  title:'NFT Development',         topic:'NFT',         skills:['ERC721','IPFS','Metadata','OpenSea'],     mini_project:'Create NFT collection with metadata',   project_brief:'PROJECT 2: NFT Marketplace. Create an NFT collection of 10 unique digital artworks. Deploy ERC721 contract. Store metadata on IPFS using Pinata. Build a mint page where users can mint NFTs. List on OpenSea testnet.', video_title:'NFT Marketplace Tutorial - freeCodeCamp', video_url:'https://www.youtube.com/watch?v=meTpMP0J5E8', video_duration:'2h', article_title:'IPFS Documentation', article_url:'https://docs.ipfs.tech', coding_resource_title:'Pinata IPFS Storage', coding_resource_url:'https://www.pinata.cloud' },
  ],
  gamedev: [
    { day:1,  title:'Unity Fundamentals',      topic:'Unity',       skills:['Unity','C#','GameObject','Scene'],       mini_project:'Build rolling ball game',               project_brief:null, video_title:'Unity Beginner Tutorial - Brackeys', video_url:'https://www.youtube.com/watch?v=gB1F9G0JXOo', video_duration:'2h', article_title:'Unity Official Learn Platform', article_url:'https://learn.unity.com', coding_resource_title:'Unity for Beginners - Official', coding_resource_url:'https://unity.com/learn/get-started' },
    { day:2,  title:'C# for Unity',            topic:'C#',          skills:['C#','OOP','MonoBehaviour','Variables'],  mini_project:'Create player movement script',         project_brief:null, video_title:'C# for Unity - Brackeys', video_url:'https://www.youtube.com/watch?v=IufhNn4K18A', video_duration:'2h', article_title:'C# Programming Guide - Microsoft', article_url:'https://docs.microsoft.com/en-us/dotnet/csharp/programming-guide/', coding_resource_title:'C# Exercises - Exercism', coding_resource_url:'https://exercism.org/tracks/csharp' },
    { day:3,  title:'Physics & Collision',     topic:'Physics',     skills:['Rigidbody','Collider','Physics','Force'], mini_project:'Build simple 2D platformer',            project_brief:null, video_title:'Unity Physics Tutorial - Brackeys', video_url:'https://www.youtube.com/watch?v=XtQMytORBmM', video_duration:'1h', article_title:'Unity Physics Documentation', article_url:'https://docs.unity3d.com/Manual/PhysicsSection.html', coding_resource_title:'Unity Physics Tutorials', coding_resource_url:'https://learn.unity.com/tutorial/physics' },
    { day:4,  title:'UI & Game Menus',         topic:'UI',          skills:['Canvas','UI','TextMeshPro','Scenes'],    mini_project:'Build main menu and HUD',               project_brief:'PROJECT 1: Complete 2D Platformer Game. Player movement, enemies with basic AI, collectible coins, score system, multiple levels, death and respawn, win condition, main menu, pause menu. Publish to itch.io for free.', video_title:'Unity UI Tutorial - Brackeys', video_url:'https://www.youtube.com/watch?v=_RIsfVOqTaE', video_duration:'1h', article_title:'Unity UI System Docs', article_url:'https://docs.unity3d.com/Manual/UISystem.html', coding_resource_title:'TextMeshPro Docs', coding_resource_url:'https://docs.unity3d.com/Packages/com.unity.textmeshpro@3.0/manual/' },
    { day:5,  title:'Audio & Effects',         topic:'Audio',       skills:['AudioSource','Particle','VFX','Animation'],mini_project:'Add sound and particles to game',     project_brief:null, video_title:'Unity Audio Tutorial', video_url:'https://www.youtube.com/watch?v=6OT43pvUyfY', video_duration:'1h', article_title:'Unity Audio Docs', article_url:'https://docs.unity3d.com/Manual/AudioOverview.html', coding_resource_title:'Free Game Sounds - Freesound', coding_resource_url:'https://freesound.org' },
    { day:6,  title:'3D Game Development',     topic:'3D',          skills:['3D','Lighting','Camera','Materials'],    mini_project:'Build simple 3D obstacle course',       project_brief:null, video_title:'Unity 3D Tutorial - Brackeys', video_url:'https://www.youtube.com/watch?v=j48LtUkZRjU', video_duration:'2h', article_title:'Unity 3D Graphics Docs', article_url:'https://docs.unity3d.com/Manual/Graphics.html', coding_resource_title:'Free 3D Assets - Unity Store', coding_resource_url:'https://assetstore.unity.com/packages/3d' },
    { day:7,  title:'Publish Your Game',       topic:'Publishing',  skills:['Build','WebGL','itch.io','Play Store'],  mini_project:'Publish game to web',                  project_brief:'PROJECT 2: 3D Endless Runner Game. Player runs forward automatically. Obstacles spawn randomly. Speed increases over time. Collect power-ups. High score system with PlayerPrefs. Build for WebGL. Publish on itch.io. Share link publicly.', video_title:'Publish Unity Game to Web - Tutorial', video_url:'https://www.youtube.com/watch?v=7nxKAtxGSn8', video_duration:'1h', article_title:'itch.io Publishing Guide', article_url:'https://itch.io/docs/creators/faq', coding_resource_title:'itch.io Game Publishing', coding_resource_url:'https://itch.io/game/new' },
  ],
  systemdesign: [
    { day:1,  title:'System Design Basics',    topic:'Fundamentals',skills:['Scalability','Load Balancing','Caching'], mini_project:'Design URL shortener on paper',         project_brief:null, video_title:'System Design for Beginners - Gaurav Sen', video_url:'https://www.youtube.com/watch?v=xpDnVSmNFX0', video_duration:'2h', article_title:'System Design Primer - GitHub (200k stars)', article_url:'https://github.com/donnemartin/system-design-primer', coding_resource_title:'High Scalability Blog', coding_resource_url:'http://highscalability.com' },
    { day:2,  title:'Databases & Storage',     topic:'Databases',   skills:['SQL','NoSQL','Sharding','Replication'],   mini_project:'Design database schema for Twitter',    project_brief:null, video_title:'Database Design - Caleb Curry', video_url:'https://www.youtube.com/watch?v=ztHopE5Wnpc', video_duration:'2h', article_title:'Choosing the Right Database', article_url:'https://www.mongodb.com/nosql-explained/nosql-vs-sql', coding_resource_title:'DB Design Practice - dbdiagram.io', coding_resource_url:'https://dbdiagram.io' },
    { day:3,  title:'Microservices',           topic:'Architecture',skills:['Microservices','API Gateway','Docker'],   mini_project:'Design microservice architecture',      project_brief:null, video_title:'Microservices - TechWorld with Nana', video_url:'https://www.youtube.com/watch?v=sFCgXH7DwxM', video_duration:'2h', article_title:'Microservices.io Patterns', article_url:'https://microservices.io/patterns/', coding_resource_title:'Martin Fowler Microservices Guide', coding_resource_url:'https://martinfowler.com/articles/microservices.html' },
    { day:4,  title:'Caching & CDN',           topic:'Performance', skills:['Redis','CDN','Cache Invalidation'],       mini_project:'Design Netflix-like CDN system',        project_brief:'PROJECT 1: Distributed Cache System. Build a simple LRU Cache in Python. Implement get and set operations with O(1) complexity. Add TTL (time-to-live). Write unit tests. Document time and space complexity. Push to GitHub with detailed README.', video_title:'Redis Cache Tutorial - TechWorld with Nana', video_url:'https://www.youtube.com/watch?v=a4yX7RUgTxI', video_duration:'1h', article_title:'AWS CloudFront CDN Docs', article_url:'https://docs.aws.amazon.com/cloudfront/', coding_resource_title:'Redis Official Docs', coding_resource_url:'https://redis.io/docs/' },
    { day:5,  title:'Message Queues',          topic:'Async',       skills:['Kafka','RabbitMQ','Event Driven'],        mini_project:'Design notification system',            project_brief:null, video_title:'Apache Kafka Tutorial - TechWorld', video_url:'https://www.youtube.com/watch?v=Ch5VhJzaoaI', video_duration:'2h', article_title:'Kafka Official Documentation', article_url:'https://kafka.apache.org/documentation/', coding_resource_title:'RabbitMQ Tutorials', coding_resource_url:'https://www.rabbitmq.com/tutorials' },
    { day:6,  title:'API Design',              topic:'APIs',        skills:['REST','GraphQL','gRPC','Rate Limiting'],  mini_project:'Design and document Uber API',          project_brief:null, video_title:'API Design Best Practices - Arpit Bhayani', video_url:'https://www.youtube.com/watch?v=_Yi2NMSusYU', video_duration:'1h', article_title:'API Design Guide - Google', article_url:'https://cloud.google.com/apis/design', coding_resource_title:'Swagger/OpenAPI Docs', coding_resource_url:'https://swagger.io/docs/' },
    { day:7,  title:'System Design Interviews',topic:'Interview',   skills:['Whiteboard','Trade-offs','Estimation','Communication'], mini_project:'Design WhatsApp + YouTube end-to-end', project_brief:'PROJECT 2: Real-Time Chat System. Build WebSocket-based chat with Node.js. Use Redis Pub/Sub for multi-server message routing. Store history in MongoDB. Add message delivery status (sent/delivered/read). Containerize with Docker Compose. Document architecture decisions with diagrams.', video_title:'System Design Mock Interview - Exponent', video_url:'https://www.youtube.com/watch?v=bUHFg8CZFws', video_duration:'1h', article_title:'Grokking System Design - DesignGurus', article_url:'https://www.designgurus.io/course/grokking-the-system-design-interview', coding_resource_title:'Pramp Free System Design Interviews', coding_resource_url:'https://www.pramp.com/topic/system-design' },
  ],
};

const DomainExplorer = () => {
  const [selected, setSelected] = useState({ domain: null, timeline: 'daily', level: 'beginner' });
  const [generating, setGenerating] = useState(false);
  const { user, setProfile } = useStore();
  const navigate = useNavigate();

  const handleGenerate = async () => {
    if (!selected.domain) return toast.error('Pick a domain first');
    setGenerating(true);

    try {
      // Update profile with domain + preferences
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          domain_id: selected.domain.id,
          timeline: selected.timeline,
          level: selected.level,
          current_day: 1,
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Delete existing tasks
      await supabase.from('tasks').delete().eq('user_id', user.id);

      // Insert roadmap tasks
      const roadmap = ROADMAP_DATA[selected.domain.id] || [];
      if (roadmap.length > 0) {
        const tasks = roadmap.map(item => ({
          user_id: user.id,
          day: item.day,
          title: item.title,
          topic: item.topic,
          skills: item.skills,
          mini_project: item.mini_project,
          project_brief: item.project_brief,
          video_title: item.video_title,
          video_url: item.video_url,
          video_duration: item.video_duration,
          article_title: item.article_title,
          article_url: item.article_url,
          coding_resource_title: item.coding_resource_title,
          coding_resource_url: item.coding_resource_url,
          status: 'pending',
          domain_id: selected.domain.id,
        }));
        const { error: tasksError } = await supabase.from('tasks').insert(tasks);
        if (tasksError) throw tasksError;
      }

      // Refresh profile in store
      const { data: profile } = await supabase
        .from('profiles').select('*').eq('id', user.id).single();
      if (profile) setProfile(profile);

      toast.success(`${selected.domain.name} roadmap generated! 🚀`);
      navigate('/student/roadmap');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate roadmap. Try again.');
    } finally {
      setGenerating(false);
    }
  };

  const dayCount = selected.domain ? (ROADMAP_DATA[selected.domain.id] || []).length : 0;

  return (
    <div className="min-h-screen cyber-grid" style={{ background: '#050508' }}>
      <Navbar />
      <div className="pt-20 pb-12 px-4 max-w-5xl mx-auto">

        {/* Header */}
        <div className="text-center mb-10">
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold font-heading logo-glow mb-2">
            Choose Your Domain
          </motion.h1>
          <p className="text-gray-500 text-sm">
            Pick your track. We'll generate your personalized learning roadmap.
          </p>
        </div>

        {/* Domain Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
          {DOMAINS.map((domain, i) => (
            <motion.button
              key={domain.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setSelected(s => ({ ...s, domain }))}
              className="p-4 rounded-2xl text-center transition-all"
              style={{
                background: selected.domain?.id === domain.id
                  ? `${domain.color}12` : 'rgba(10,10,18,0.9)',
                border: `1px solid ${selected.domain?.id === domain.id
                  ? domain.color + '55' : 'rgba(34,34,51,0.6)'}`,
                boxShadow: selected.domain?.id === domain.id
                  ? `0 0 20px ${domain.color}18` : 'none',
              }}>
              <div className="text-3xl mb-2">{domain.icon}</div>
              <div className="text-xs font-semibold text-white leading-tight mb-1">{domain.name}</div>
              <div className="text-xs text-gray-600 leading-tight">{domain.desc}</div>
            </motion.button>
          ))}
        </div>

        {/* Configure: Timeline + Level */}
        {selected.domain && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid md:grid-cols-2 gap-6 mb-8">

            {/* Timeline */}
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
                Study Timeline
              </h3>
              <div className="space-y-2">
                {TIMELINES.map(t => (
                  <button key={t.id}
                    onClick={() => setSelected(s => ({ ...s, timeline: t.id }))}
                    className="w-full flex items-center gap-3 p-3 rounded-xl transition-all"
                    style={{
                      background: selected.timeline === t.id
                        ? 'rgba(0,255,148,0.07)' : 'rgba(10,10,18,0.9)',
                      border: `1px solid ${selected.timeline === t.id
                        ? 'rgba(0,255,148,0.3)' : 'rgba(34,34,51,0.6)'}`,
                    }}>
                    <span className="text-xl flex-shrink-0">{t.icon}</span>
                    <div className="text-left">
                      <div className="text-sm font-semibold text-white">{t.label}</div>
                      <div className="text-xs text-gray-600">{t.desc}</div>
                    </div>
                    {selected.timeline === t.id && (
                      <span className="ml-auto text-primary text-xs font-bold">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Level */}
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
                Your Current Level
              </h3>
              <div className="space-y-2">
                {LEVELS.map(l => (
                  <button key={l.id}
                    onClick={() => setSelected(s => ({ ...s, level: l.id }))}
                    className="w-full flex items-center gap-3 p-3 rounded-xl transition-all"
                    style={{
                      background: selected.level === l.id
                        ? 'rgba(0,255,148,0.07)' : 'rgba(10,10,18,0.9)',
                      border: `1px solid ${selected.level === l.id
                        ? 'rgba(0,255,148,0.3)' : 'rgba(34,34,51,0.6)'}`,
                    }}>
                    <span className="text-xl flex-shrink-0">{l.icon}</span>
                    <div className="text-left">
                      <div className="text-sm font-semibold text-white">{l.label}</div>
                      <div className="text-xs text-gray-600">{l.desc}</div>
                    </div>
                    {selected.level === l.id && (
                      <span className="ml-auto text-primary text-xs font-bold">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Summary + Generate */}
        {selected.domain && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center">

            {/* Preview card */}
            <div className="inline-flex items-center gap-4 px-6 py-3 rounded-2xl mb-6"
              style={{
                background: `${selected.domain.color}08`,
                border: `1px solid ${selected.domain.color}25`,
              }}>
              <span className="text-2xl">{selected.domain.icon}</span>
              <div className="text-left">
                <div className="text-sm font-bold text-white">{selected.domain.name}</div>
                <div className="text-xs text-gray-500">
                  {dayCount} days · {selected.timeline} plan · {selected.level}
                </div>
              </div>
            </div>

            <div>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="btn-neon px-10 py-4 rounded-2xl font-bold text-base disabled:opacity-50 disabled:cursor-not-allowed">
                {generating
                  ? '⚡ Generating roadmap...'
                  : `Generate ${selected.domain.name} Roadmap →`}
              </button>
              <p className="text-xs text-gray-600 mt-3">
                This will create {dayCount} structured learning days for you
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default DomainExplorer;
