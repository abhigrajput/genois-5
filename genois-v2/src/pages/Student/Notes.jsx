import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pin, Code, Search,
         Trash2, Save, X, BookOpen,
         Library, Zap, Copy, ChevronDown,
         ChevronUp } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { supabase } from '../../lib/supabase';
import useStore from '../../store/useStore';
import toast from 'react-hot-toast';

const TOPICS = [
  'All','DSA','Web Dev','React','Node.js',
  'Python','Database','System Design',
  'Algorithms','Security','DevOps','AI/ML','Other',
];

const DOMAIN_NOTES = {
  fullstack: [
    {
      title: 'How the Web Works — Simple Explanation',
      topic: 'Web Dev',
      pinned: true,
      theory: `🧠 WHAT IS IT?
Think of the web like ordering food at a restaurant.
YOU = browser (customer)
WAITER = HTTP request
KITCHEN = server
FOOD = HTML/CSS/JavaScript files

When you type "google.com":
1. Your browser asks DNS: "Where is google.com?"
2. DNS says: "It lives at IP: 142.250.67.46"
3. Browser connects to that server
4. Server sends back HTML, CSS, JS files
5. Browser renders them into the page you see

📝 KEY POINTS:
- HTTP = language browsers and servers use to talk
- HTTPS = HTTP + encryption (your data is safe)
- Status codes:
  - 200 = OK (success)
  - 404 = Not Found (page doesn't exist)
  - 500 = Server Error (something broke on server)
- DNS = phonebook of the internet (domain → IP)
- Every webpage = files sent from a server to your browser

🔥 REMEMBER:
"The internet is just computers talking to each other.
Your browser asks, the server answers."`,
      code: `// Making a request in JavaScript (like your browser does)

// Old way - using .then() chains
fetch("https://api.github.com/users/abhigrajput")
  .then(response => response.json())
  .then(data => {
    console.log("Name:", data.name);
    console.log("Repos:", data.public_repos);
  })
  .catch(error => {
    console.error("Something went wrong:", error);
  });

// Modern way - async/await (PREFERRED - easier to read)
const getUserData = async () => {
  try {
    // Step 1: Make the request
    const response = await fetch("https://api.github.com/users/abhigrajput");

    // Step 2: Check if request succeeded
    if (!response.ok) {
      throw new Error("Request failed: " + response.status);
    }

    // Step 3: Convert response to JavaScript object
    const data = await response.json();

    // Step 4: Use the data
    console.log("User:", data.name);
    return data;

  } catch (error) {
    console.error("Error:", error.message);
  }
};

getUserData();`,
      language: 'javascript',
    },
    {
      title: 'JavaScript: var vs let vs const',
      topic: 'Web Dev',
      pinned: true,
      theory: `🧠 WHAT IS IT?
Three ways to create variables in JavaScript.
Think of variables like boxes that store values.

CONST = A sealed box (cannot change what's inside)
LET = A normal box (can change what's inside)
VAR = A broken box (avoid - causes bugs!)

💡 REAL EXAMPLE:
const PIZZA_PRICE = 299;     // Price never changes
let customerCount = 0;       // Changes as people arrive
customerCount = 5;           // ✅ OK

📝 KEY POINTS:
- Use CONST by DEFAULT always
- Switch to LET only when you NEED to change the value
- NEVER use VAR (it leaks out of if/for blocks)
- const object PROPERTIES can still be changed
- const array ITEMS can still be added/changed

🔥 RULE TO REMEMBER:
"Start with const. If you get an error saying
you can't reassign, switch to let."`,
      code: `// ✅ CONST - cannot reassign the variable
const API_URL = "https://api.example.com";
const MAX_USERS = 100;
const PI = 3.14159;

// API_URL = "other"; ❌ ERROR - cannot reassign const

// ✅ LET - can reassign
let score = 0;
let isLoggedIn = false;
score = 100;        // ✅ Works
isLoggedIn = true;  // ✅ Works

// ❌ VAR - avoid completely
var oldWay = "bad";  // Leaks outside blocks!

// TRICKY PART: const with objects
// The variable binding is locked, not the content!
const user = { name: "Abhishek", score: 0 };
user.name = "Abhi";    // ✅ Works! Changing property
user.score = 500;      // ✅ Works! Changing property
// user = {};          // ❌ ERROR! Cannot reassign

// TRICKY PART: const with arrays
const scores = [90, 85, 92];
scores.push(88);       // ✅ Works! Adding to array
scores[0] = 95;        // ✅ Works! Changing element
// scores = [];        // ❌ ERROR! Cannot reassign

// Block scope - why var is dangerous
if (true) {
  let blockVar = "inside";   // Only exists inside {}
  const blockConst = "safe"; // Only exists inside {}
  var leaky = "I escape!";   // LEAKS outside {} ← BAD
}
// console.log(blockVar);  // ❌ ERROR
// console.log(blockConst);// ❌ ERROR
console.log(leaky);         // ✅ "I escape!" ← dangerous`,
      language: 'javascript',
    },
    {
      title: 'React useState — Complete Guide',
      topic: 'React',
      pinned: false,
      theory: `🧠 WHAT IS IT?
useState is like a special variable that makes
React update the screen when the value changes.

Normal variable: Changes don't update the screen
useState variable: Changes automatically update screen

Think of it like a whiteboard:
- Without useState: You erase and rewrite but no one sees
- With useState: Whenever you change it, everyone sees it update live

💡 REAL EXAMPLE:
A "Like" button counter. When user clicks:
1. Count goes from 0 → 1
2. React sees the state changed
3. React re-renders the component
4. User sees "1 Like" on screen

📝 KEY POINTS:
- useState returns [currentValue, functionToUpdate]
- Calling the update function triggers re-render
- NEVER change state directly: count = count + 1 ← WRONG
- ALWAYS use the setter: setCount(count + 1) ← RIGHT
- State updates are async (not immediate)
- Use functional updates when depending on previous value

🔥 REMEMBER:
"State is React's memory. Change state =
React redraws the component."`,
      code: `import { useState } from "react";

// BASIC EXAMPLE - Counter
function LikeButton() {
  // [current value, function to update it]
  const [likes, setLikes] = useState(0);  // starts at 0

  const handleLike = () => {
    setLikes(likes + 1);  // update state → React re-renders
  };

  return (
    <button onClick={handleLike}>
      ❤️ {likes} Likes
    </button>
  );
}

// OBJECT STATE - Profile form
function ProfileForm() {
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    college: ""
  });

  // ✅ RIGHT WAY - spread existing, update one field
  const updateField = (field, value) => {
    setProfile(prev => ({
      ...prev,           // keep all other fields
      [field]: value     // update only this field
    }));
  };

  // ❌ WRONG WAY - this loses other fields
  // setProfile({ name: "Abhi" }); // email and college disappear!

  return (
    <div>
      <input
        value={profile.name}
        onChange={e => updateField("name", e.target.value)}
        placeholder="Your name"
      />
      <input
        value={profile.email}
        onChange={e => updateField("email", e.target.value)}
        placeholder="Your email"
      />
      <p>Hello {profile.name}! Your email: {profile.email}</p>
    </div>
  );
}

// FUNCTIONAL UPDATE - when new value depends on old value
function SafeCounter() {
  const [count, setCount] = useState(0);

  // ✅ Safe - uses previous value
  const increment = () => setCount(prev => prev + 1);

  // Multiple updates in one event
  const incrementThrice = () => {
    setCount(prev => prev + 1);  // uses latest value each time
    setCount(prev => prev + 1);
    setCount(prev => prev + 1);  // count increases by 3
  };

  return <button onClick={increment}>Count: {count}</button>;
}`,
      language: 'javascript',
    },
    {
      title: 'REST API: CRUD Operations',
      topic: 'Node.js',
      pinned: false,
      theory: `🧠 WHAT IS IT?
REST API = a way for frontend and backend to talk.
Like a waiter between your app and the database.

CRUD = 4 operations every app needs:
C - Create (add new data)
R - Read (get existing data)
U - Update (change existing data)
D - Delete (remove data)

HTTP Methods map to CRUD:
GET    = Read   (get me the data)
POST   = Create (add new data)
PUT    = Update (replace this data)
DELETE = Delete (remove this data)

💡 REAL EXAMPLE:
Instagram uses REST API:
GET  /posts        → show all posts (Read)
POST /posts        → create new post (Create)
PUT  /posts/123    → edit post #123 (Update)
DELETE /posts/123  → delete post #123 (Delete)

📝 KEY POINTS:
- Always return proper status codes (200, 201, 404, 500)
- 200 = Success, 201 = Created, 404 = Not Found
- Always send JSON as response
- Never put sensitive data in GET URL
- Use middleware like express.json() to parse request body

🔥 REMEMBER:
"REST is just naming conventions for HTTP.
Follow them consistently and your API will make sense."`,
      code: `const express = require("express");
const app = express();

// Parse JSON request bodies
app.use(express.json());

// In-memory storage (replace with database in real app)
let users = [
  { id: 1, name: "Abhishek", email: "abhi@gmail.com" }
];
let nextId = 2;

// READ ALL - GET /users
app.get("/users", (req, res) => {
  res.status(200).json({
    success: true,
    count: users.length,
    data: users
  });
});

// READ ONE - GET /users/:id
app.get("/users/:id", (req, res) => {
  const user = users.find(u => u.id === parseInt(req.params.id));

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found"
    });
  }

  res.status(200).json({ success: true, data: user });
});

// CREATE - POST /users
app.post("/users", (req, res) => {
  const { name, email } = req.body;

  if (!name || !email) {
    return res.status(400).json({
      success: false,
      message: "Name and email are required"
    });
  }

  const newUser = { id: nextId++, name, email };
  users.push(newUser);

  res.status(201).json({ success: true, data: newUser });
});

// UPDATE - PUT /users/:id
app.put("/users/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const index = users.findIndex(u => u.id === id);

  if (index === -1) {
    return res.status(404).json({ message: "User not found" });
  }

  users[index] = { ...users[index], ...req.body };
  res.json({ success: true, data: users[index] });
});

// DELETE - DELETE /users/:id
app.delete("/users/:id", (req, res) => {
  const id = parseInt(req.params.id);
  users = users.filter(u => u.id !== id);

  res.json({ success: true, message: "User deleted" });
});

app.listen(3000, () => console.log("Server running on :3000"));`,
      language: 'javascript',
    },
  ],
  cybersecurity: [
    {
      title: 'SQL Injection — Attack & Defense',
      topic: 'Security',
      pinned: true,
      theory: `🧠 WHAT IS IT?
SQL Injection = putting SQL code inside a form input
to hack a database.

Think of it like this:
Normal login form does:
SELECT * FROM users WHERE email='you@email.com' AND password='abc'

A hacker types in the email field:
admin@site.com' OR '1'='1

Now the query becomes:
SELECT * FROM users WHERE email='admin@site.com' OR '1'='1'

'1'='1' is ALWAYS TRUE = hacker logs in without password!

💡 REAL EXAMPLE:
In 2009, a hacker used SQL injection to steal
130 million credit card numbers from Heartland Payment.
Cost: $130 million in damages.

📝 HOW TO PREVENT:
1. Use parameterized queries (most important!)
2. Use an ORM (Prisma, Sequelize)
3. Validate all user inputs
4. Use prepared statements
5. Give DB user minimum permissions

🔥 RULE:
"NEVER put user input directly into a SQL string.
ALWAYS use parameterized queries."`,
      code: `// ❌ VULNERABLE - Never do this!
const email = req.body.email;  // user controls this!
const query = "SELECT * FROM users WHERE email = '" + email + "'";
// Hacker input: ' OR '1'='1' --
// This returns ALL users from database!

// ✅ SAFE METHOD 1: Parameterized Query (node-postgres)
const { data } = await db.query(
  "SELECT * FROM users WHERE email = $1",
  [email]  // email is treated as data, not SQL code
);

// ✅ SAFE METHOD 2: Prisma ORM (auto-escapes everything)
const user = await prisma.user.findUnique({
  where: { email: email }  // Prisma handles escaping
});

// ✅ SAFE METHOD 3: Supabase (auto-escapes)
const { data: user } = await supabase
  .from('users')
  .select('*')
  .eq('email', email);  // Safe!

// How to TEST if a site is vulnerable:
// Try these in any input field:
// 1. Single quote: '
// 2. Double quote: "
// 3. Boolean: ' OR '1'='1
// 4. Comment: ' --
// 5. UNION: ' UNION SELECT null,null --
// If you get a database error = VULNERABLE!

// ✅ Input validation (extra protection)
const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

if (!validateEmail(req.body.email)) {
  return res.status(400).json({ error: "Invalid email format" });
}`,
      language: 'javascript',
    },
  ],
  dsa: [
    {
      title: 'Two Pointer Technique — Complete Guide',
      topic: 'DSA',
      pinned: true,
      theory: `🧠 WHAT IS IT?
Two pointer technique = using 2 indices to
traverse array instead of nested loops.

Result: O(n²) becomes O(n) — much faster!

Think of it like searching for a specific total
weight using two people walking from opposite ends
of a balance scale.

💡 REAL EXAMPLE:
Find two numbers that add to 8 in [1,3,5,7,9]:
Brute force: Check every pair → 10 comparisons
Two pointer: Left=1, Right=9 → sum=10 too big → move right
            Left=1, Right=7 → sum=8 → FOUND! → 3 comparisons

📝 WHEN TO USE:
✅ Sorted array + find pair/triplet
✅ Palindrome check
✅ Remove duplicates
✅ Container with most water
✅ 3Sum problem

📝 KEY POINTS:
- Usually works on SORTED arrays
- Left pointer starts at index 0
- Right pointer starts at last index
- Move left right if sum too small
- Move right left if sum too big
- Stop when left >= right

🔥 PATTERN TO RECOGNIZE:
"Sorted array + find pair/subarray = Try Two Pointer!"`,
      code: `// PROBLEM 1: Two Sum (Sorted Array)
// Find indices of two numbers that add to target
function twoSum(arr, target) {
  let left = 0;
  let right = arr.length - 1;

  while (left < right) {
    const sum = arr[left] + arr[right];

    if (sum === target) {
      return [left, right];  // ✅ Found!
    } else if (sum < target) {
      left++;   // Need bigger sum → move left right
    } else {
      right--;  // Need smaller sum → move right left
    }
  }
  return [-1, -1];  // Not found
}

console.log(twoSum([1, 3, 5, 7, 9], 8));   // [1, 2] → 3+5=8
console.log(twoSum([1, 3, 5, 7, 9], 100)); // [-1, -1]

// PROBLEM 2: Valid Palindrome
// Check if string reads same forwards and backwards
function isPalindrome(str) {
  // Clean string: only letters and numbers, lowercase
  const clean = str.toLowerCase().replace(/[^a-z0-9]/g, '');

  let left = 0;
  let right = clean.length - 1;

  while (left < right) {
    if (clean[left] !== clean[right]) {
      return false;  // Mismatch found
    }
    left++;
    right--;
  }
  return true;  // All characters matched
}

console.log(isPalindrome("racecar"));        // true
console.log(isPalindrome("A man a plan a canal Panama")); // true
console.log(isPalindrome("hello"));          // false

// PROBLEM 3: Remove Duplicates (Sorted Array)
// Remove duplicates in-place, return count of unique elements
function removeDuplicates(nums) {
  if (nums.length === 0) return 0;

  let slow = 0;  // Points to last unique element

  for (let fast = 1; fast < nums.length; fast++) {
    if (nums[fast] !== nums[slow]) {
      slow++;
      nums[slow] = nums[fast];  // Place unique element
    }
    // If duplicate: just skip it (fast advances, slow stays)
  }

  return slow + 1;  // Count of unique elements
}

const arr = [1, 1, 2, 2, 3, 4, 4, 5];
const count = removeDuplicates(arr);
console.log(count);           // 5
console.log(arr.slice(0, 5)); // [1, 2, 3, 4, 5]`,
      language: 'javascript',
    },
    {
      title: 'Binary Search — Complete Template',
      topic: 'Algorithms',
      pinned: true,
      theory: `🧠 WHAT IS IT?
Binary search = finding something by eliminating
half the possibilities each time.

Like finding a word in dictionary:
Open middle → word before or after?
Eliminate half → repeat → done in ~10 steps for 1000 pages!

O(n) linear search: Check 1000 items = 1000 steps
O(log n) binary search: Check 1000 items = 10 steps

💡 REAL EXAMPLE:
Guess a number 1-100:
Linear: 1, 2, 3... (worst case 100 guesses)
Binary: 50 (too high) → 25 (too low) → 37 (too high) → 31...
Binary is ALWAYS faster!

📝 THE TEMPLATE (memorize this):
left = 0
right = length - 1
while left <= right:
  mid = left + (right - left) / 2
  if arr[mid] == target: return mid
  if arr[mid] < target: left = mid + 1
  else: right = mid - 1

📝 KEY POINTS:
- Array MUST be sorted first!
- mid = left + (right-left)/2 to prevent overflow
- While condition: left <= right (not just less than)
- Move left when arr[mid] < target
- Move right when arr[mid] > target

🔥 PATTERN TO RECOGNIZE:
"Sorted data + find element/position = Binary Search!"`,
      code: `// TEMPLATE: Classic Binary Search
function binarySearch(arr, target) {
  let left = 0;
  let right = arr.length - 1;

  while (left <= right) {
    // Prevents integer overflow (important in Java/C++)
    const mid = left + Math.floor((right - left) / 2);

    if (arr[mid] === target) {
      return mid;       // ✅ Found at index mid!
    } else if (arr[mid] < target) {
      left = mid + 1;   // Target is in RIGHT half
    } else {
      right = mid - 1;  // Target is in LEFT half
    }
  }

  return -1;  // Not found
}

// Test
const sorted = [1, 3, 5, 7, 9, 11, 13, 15, 17];
console.log(binarySearch(sorted, 7));   // 3 (index 3)
console.log(binarySearch(sorted, 6));   // -1 (not found)
console.log(binarySearch(sorted, 17));  // 8 (last index)

// VARIANT: Find First Occurrence (duplicates exist)
function findFirst(arr, target) {
  let left = 0, right = arr.length - 1;
  let result = -1;

  while (left <= right) {
    const mid = left + Math.floor((right - left) / 2);
    if (arr[mid] === target) {
      result = mid;    // Save this answer
      right = mid - 1; // Keep searching LEFT for earlier one
    } else if (arr[mid] < target) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }
  return result;
}

// VARIANT: Search in Rotated Sorted Array (LeetCode 33)
function searchRotated(nums, target) {
  let left = 0, right = nums.length - 1;

  while (left <= right) {
    const mid = left + Math.floor((right - left) / 2);
    if (nums[mid] === target) return mid;

    // Check which half is sorted
    if (nums[left] <= nums[mid]) {
      // Left half is sorted
      if (target >= nums[left] && target < nums[mid]) {
        right = mid - 1;  // Target in left half
      } else {
        left = mid + 1;   // Target in right half
      }
    } else {
      // Right half is sorted
      if (target > nums[mid] && target <= nums[right]) {
        left = mid + 1;   // Target in right half
      } else {
        right = mid - 1;  // Target in left half
      }
    }
  }
  return -1;
}`,
      language: 'javascript',
    },
  ],
  aiml: [
    {
      title: 'Linear Regression — Simple Explanation',
      topic: 'AI/ML',
      pinned: true,
      theory: `🧠 WHAT IS IT?
Linear regression = finding the best straight line
through data points to make predictions.

Think of it like this:
You have data: House size → House price
500 sqft = ₹25 lakh
1000 sqft = ₹50 lakh
1500 sqft = ₹75 lakh

Pattern: price = 0.05 × size
Linear regression FINDS this pattern automatically!

💡 REAL EXAMPLE:
You're a student. You want to predict your exam score.
Data: Hours studied → Score
1 hour → 40%
2 hours → 55%
3 hours → 70%
4 hours → 85%
Pattern: score = 25 + (15 × hours)
Predict 5 hours: 25 + 75 = 100% 🎯

📝 KEY POINTS:
- y = mx + b (equation of a line)
  - y = output (price, score)
  - x = input (size, hours)
  - m = slope (how much y changes per x)
  - b = intercept (y value when x = 0)
- Loss function = measures how wrong predictions are
- MSE = Mean Squared Error = average of (actual - predicted)²
- Model learns by minimizing MSE
- R² score: 1.0 = perfect, 0.0 = no better than random

🔥 REMEMBER:
"Linear regression draws the best possible straight
line through your data to predict future values."`,
      code: `# Linear Regression with Scikit-learn
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_squared_error

# ============ STEP 1: PREPARE DATA ============
# X = features (what we know)
# y = target (what we want to predict)

# Hours studied → Exam score
X = np.array([[1], [2], [3], [4], [5], [6], [7], [8]])
y = np.array([40, 55, 65, 75, 82, 88, 92, 96])

# Split: 80% training, 20% testing
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# ============ STEP 2: TRAIN MODEL ============
model = LinearRegression()
model.fit(X_train, y_train)  # Model learns from training data

# What did the model learn?
print(f"Slope (m): {model.coef_[0]:.2f}")       # Points per hour
print(f"Intercept (b): {model.intercept_:.2f}")  # Base score

# ============ STEP 3: EVALUATE MODEL ============
y_predicted = model.predict(X_test)
r2 = r2_score(y_test, y_predicted)
mse = mean_squared_error(y_test, y_predicted)

print(f"R² Score: {r2:.3f}")   # 1.0 = perfect
print(f"MSE: {mse:.2f}")

# ============ STEP 4: MAKE PREDICTIONS ============
new_hours = np.array([[9], [10]])
predictions = model.predict(new_hours)
print(f"9 hours study → {predictions[0]:.1f}% predicted")
print(f"10 hours study → {predictions[1]:.1f}% predicted")

# ============ VISUALIZE (bonus) ============
import matplotlib.pyplot as plt

plt.scatter(X, y, color='blue', label='Actual data')
plt.plot(X, model.predict(X), color='red', label='Regression line')
plt.xlabel('Hours Studied')
plt.ylabel('Exam Score (%)')
plt.title('Study Hours vs Exam Score')
plt.legend()
plt.show()`,
      language: 'python',
    },
  ],
};

const getAllNotes = (domain) => {
  const domainNotes = DOMAIN_NOTES[domain] || DOMAIN_NOTES['fullstack'];
  const dsaNotes = domain !== 'dsa' ? DOMAIN_NOTES['dsa'] || [] : [];
  return [...domainNotes, ...dsaNotes.slice(0, 2)];
};

const CodeBlock = ({ code, language }) => {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success('Code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-3 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2"
        style={{ background:'#020205', borderBottom:'1px solid rgba(0,255,148,0.08)' }}>
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-danger/70"/>
            <div className="w-2.5 h-2.5 rounded-full bg-warning/70"/>
            <div className="w-2.5 h-2.5 rounded-full bg-success/70"/>
          </div>
          <span className="text-xs text-gray-600 font-mono">{language}</span>
        </div>
        <button onClick={copy}
          className="flex items-center gap-1 text-xs transition-colors"
          style={{ color: copied ? '#00FF94' : '#555' }}>
          <Copy size={10}/>
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre
        className="px-4 py-3 text-xs font-mono text-gray-300 overflow-x-auto leading-relaxed"
        style={{ background:'#020205', maxHeight:'320px' }}>
        <code>{code}</code>
      </pre>
    </div>
  );
};

const Notes = () => {
  const { profile } = useStore();
  const [tab, setTab] = useState('library');
  const [myNotes, setMyNotes] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('All');
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [form, setForm] = useState({
    title:'', content:'', code_snippet:'',
    code_language:'javascript', topic:'Other', is_pinned:false,
  });

  const domain = profile?.domain_id || 'fullstack';
  const studyNotes = getAllNotes(domain);

  const filteredStudy = studyNotes.filter(n => {
    const matchTopic = selectedTopic === 'All' || n.topic === selectedTopic;
    const matchSearch = !search ||
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.theory.toLowerCase().includes(search.toLowerCase());
    return matchTopic && matchSearch;
  });

  useEffect(() => {
    if (profile?.id) fetchMyNotes();
  }, [profile?.id]);

  const fetchMyNotes = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('notes').select('*')
      .eq('student_id', profile.id)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });
    setMyNotes(data || []);
    setLoading(false);
  };

  const generateAINote = async () => {
    if (!form.title.trim()) {
      toast.error('Enter a topic title first!');
      return;
    }
    setGenerating(true);
    toast.loading('AI generating notes...', { id:'ai' });

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': import.meta.env.VITE_CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          messages: [{
            role: 'user',
            content: `You are a teacher explaining to a first-year engineering student.
Topic: ${form.title}
Student Domain: ${profile?.domain_id || 'general'}

Generate study notes in this EXACT JSON format:
{
  "theory": "Explanation using simple everyday language. Use emojis and sections. Include: WHAT IS IT (simple analogy), REAL EXAMPLE (practical), KEY POINTS (bullet list), REMEMBER (one line summary). Write like you're explaining to a friend, not writing a textbook.",
  "code": "Complete working code example with comments on EVERY important line explaining what it does",
  "language": "javascript or python or java or cpp or sql",
  "topic": "One of: DSA, Web Dev, React, Node.js, Python, Database, System Design, Algorithms, Security, DevOps, AI/ML, Other"
}

Return ONLY valid JSON. No other text.`
          }]
        })
      });

      const data = await response.json();
      const text = data.content?.[0]?.text || '';
      const clean = text.replace(/\`\`\`json|\`\`\`/g, '').trim();
      const parsed = JSON.parse(clean);

      setForm(prev => ({
        ...prev,
        content: parsed.theory || '',
        code_snippet: parsed.code || '',
        code_language: parsed.language || 'javascript',
        topic: parsed.topic || 'Other',
      }));
      setShowCode(true);
      toast.success('Notes generated! Review and save 📝', { id:'ai' });
    } catch(e) {
      console.error(e);
      toast.error('AI generation failed. Write manually.', { id:'ai' });
    }
    setGenerating(false);
  };

  const saveNote = async () => {
    if (!form.title.trim()) { toast.error('Add title'); return; }
    setSaving(true);
    const { error } = await supabase.from('notes').insert({
      student_id: profile.id,
      domain_id: domain,
      title: form.title,
      content: form.content,
      code_snippet: form.code_snippet || null,
      code_language: form.code_language || 'javascript',
      topic: form.topic || 'Other',
      is_pinned: form.is_pinned,
      ai_generated: form.content.length > 100,
    });
    if (!error) {
      toast.success('Note saved! 📝');
      setForm({ title:'', content:'', code_snippet:'',
        code_language:'javascript', topic:'Other', is_pinned:false });
      setCreating(false);
      setShowCode(false);
      fetchMyNotes();
    } else {
      toast.error('Save failed: ' + error.message);
    }
    setSaving(false);
  };

  const deleteNote = async (id) => {
    await supabase.from('notes').delete().eq('id', id);
    fetchMyNotes();
    toast.success('Deleted');
  };

  const togglePin = async (note) => {
    await supabase.from('notes')
      .update({ is_pinned: !note.is_pinned }).eq('id', note.id);
    fetchMyNotes();
  };

  const toggleExpand = (key) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold font-heading text-white"
              style={{ textShadow:'0 0 15px rgba(0,255,148,0.3)' }}>
              📚 Study Notes
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Theory + Code · AI-generated · Domain-specific
            </p>
          </div>
          {tab === 'mynotes' && (
            <button onClick={() => setCreating(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm text-dark-900"
              style={{ background:'#00FF94', boxShadow:'0 0 12px rgba(0,255,148,0.3)' }}>
              <Plus size={14}/> New Note
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5">
          {[
            { id:'library', icon:<Library size={13}/>, label:'Study Library' },
            { id:'mynotes', icon:<BookOpen size={13}/>, label:'My Notes' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={tab === t.id ? {
                background:'#00FF94', color:'#050508',
              } : {
                background:'rgba(10,10,18,0.8)',
                color:'#555',
                border:'1px solid rgba(34,34,51,0.5)',
              }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Search + Topics */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600"/>
            <input value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search notes..."
              className="w-full bg-dark-800 border border-dark-600 rounded-xl pl-9 pr-4 py-2 text-sm text-gray-100 placeholder-gray-600"/>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {TOPICS.map(t => (
              <button key={t}
                onClick={() => setSelectedTopic(t)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={selectedTopic === t ? {
                  background:'#00FF94', color:'#050508',
                } : {
                  background:'rgba(10,10,18,0.8)',
                  color:'#555',
                  border:'1px solid rgba(34,34,51,0.5)',
                }}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* STUDY LIBRARY */}
        {tab === 'library' && (
          <div className="space-y-3">
            {filteredStudy.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">📚</div>
                <p className="text-gray-500 text-sm">No notes for this filter</p>
              </div>
            ) : filteredStudy.map((note, i) => (
              <div key={i}
                className="rounded-2xl overflow-hidden card-hover"
                style={{ background:'rgba(10,10,18,0.9)', border:'1px solid rgba(34,34,51,0.6)' }}>

                <button
                  onClick={() => toggleExpand(`study-${i}`)}
                  className="w-full flex items-start justify-between p-5 text-left hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-start gap-3">
                    {note.pinned && (
                      <Pin size={12} className="text-warning mt-1 flex-shrink-0"/>
                    )}
                    <div>
                      <h3 className="font-bold text-white font-heading text-sm mb-1">
                        {note.title}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background:'rgba(0,255,148,0.08)', color:'#00FF94', border:'1px solid rgba(0,255,148,0.15)' }}>
                          {note.topic}
                        </span>
                        <span className="text-xs text-gray-600 flex items-center gap-1">
                          <Code size={10}/> {note.language}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="text-gray-600 flex-shrink-0 ml-2 mt-1">
                    {expanded[`study-${i}`]
                      ? <ChevronUp size={15}/>
                      : <ChevronDown size={15}/>}
                  </span>
                </button>

                <AnimatePresence>
                  {expanded[`study-${i}`] && (
                    <motion.div
                      initial={{ height:0, opacity:0 }}
                      animate={{ height:'auto', opacity:1 }}
                      exit={{ height:0, opacity:0 }}
                      transition={{ duration:0.2 }}
                      className="px-5 pb-5">
                      <pre className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap font-sans mb-2">
                        {note.theory}
                      </pre>
                      {note.code && (
                        <CodeBlock code={note.code} language={note.language}/>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}

        {/* MY NOTES */}
        {tab === 'mynotes' && (
          <div className="flex gap-4">
            <div className="flex-1">
              {loading ? (
                <div className="space-y-3">
                  {[1,2,3].map(i => (
                    <div key={i} className="h-20 rounded-xl animate-pulse"
                      style={{ background:'rgba(18,18,26,0.8)' }}/>
                  ))}
                </div>
              ) : myNotes.length === 0 && !creating ? (
                <div className="text-center py-12">
                  <div className="text-5xl mb-3">📝</div>
                  <h2 className="font-bold text-white font-heading mb-2">
                    No notes yet
                  </h2>
                  <p className="text-gray-500 text-sm mb-4">
                    Create notes or let AI generate them
                  </p>
                  <button onClick={() => setCreating(true)}
                    className="px-5 py-2.5 rounded-xl font-bold text-sm text-dark-900"
                    style={{ background:'#00FF94' }}>
                    + Create First Note
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {myNotes
                    .filter(n =>
                      (selectedTopic === 'All' || n.topic === selectedTopic) &&
                      (!search || n.title?.toLowerCase().includes(search.toLowerCase()))
                    )
                    .map((note, i) => (
                      <div key={note.id}
                        className="rounded-xl overflow-hidden"
                        style={{ background:'rgba(10,10,18,0.9)', border:'1px solid rgba(34,34,51,0.6)' }}>

                        <button
                          onClick={() => toggleExpand(note.id)}
                          className="w-full flex items-center justify-between p-4 text-left hover:bg-white/[0.02] transition-colors">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {note.is_pinned && (
                              <Pin size={11} className="text-warning flex-shrink-0"/>
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-white truncate">
                                {note.title}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs px-1.5 py-0.5 rounded-full"
                                  style={{ background:'rgba(0,255,148,0.08)', color:'#00FF94' }}>
                                  {note.topic}
                                </span>
                                {note.ai_generated && (
                                  <span className="text-xs text-secondary flex items-center gap-0.5">
                                    <Zap size={9}/> AI
                                  </span>
                                )}
                                {note.code_snippet && (
                                  <span className="text-xs text-gray-600 flex items-center gap-1">
                                    <Code size={9}/> code
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            <button
                              onClick={e => { e.stopPropagation(); togglePin(note); }}
                              className={`p-1 rounded ${note.is_pinned ? 'text-warning' : 'text-gray-600 hover:text-warning'}`}>
                              <Pin size={12}/>
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); deleteNote(note.id); }}
                              className="p-1 rounded text-gray-600 hover:text-danger">
                              <Trash2 size={12}/>
                            </button>
                            {expanded[note.id]
                              ? <ChevronUp size={14} className="text-gray-600"/>
                              : <ChevronDown size={14} className="text-gray-600"/>}
                          </div>
                        </button>

                        <AnimatePresence>
                          {expanded[note.id] && (
                            <motion.div
                              initial={{ height:0, opacity:0 }}
                              animate={{ height:'auto', opacity:1 }}
                              exit={{ height:0, opacity:0 }}
                              transition={{ duration:0.2 }}
                              className="px-4 pb-4">
                              {note.content && (
                                <pre className="text-xs text-gray-400 leading-relaxed whitespace-pre-wrap font-sans mb-2">
                                  {note.content}
                                </pre>
                              )}
                              {note.code_snippet && (
                                <CodeBlock
                                  code={note.code_snippet}
                                  language={note.code_language}/>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>

            {/* Create panel */}
            <AnimatePresence>
              {creating && (
                <motion.div
                  initial={{ opacity:0, x:20 }}
                  animate={{ opacity:1, x:0 }}
                  exit={{ opacity:0, x:20 }}
                  className="w-80 flex-shrink-0">
                  <div className="sticky top-20 rounded-2xl overflow-hidden"
                    style={{ background:'rgba(10,10,18,0.95)', border:'1px solid rgba(0,255,148,0.15)' }}>

                    <div className="flex items-center justify-between p-4 border-b border-dark-600">
                      <h3 className="font-bold text-white font-heading text-sm">
                        New Note
                      </h3>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setForm(f => ({...f, is_pinned:!f.is_pinned}))}
                          className={`p-1.5 rounded ${form.is_pinned ? 'text-warning' : 'text-gray-600'}`}>
                          <Pin size={13}/>
                        </button>
                        <button
                          onClick={() => { setCreating(false); setShowCode(false); }}
                          className="text-gray-600 hover:text-white p-1">
                          <X size={15}/>
                        </button>
                      </div>
                    </div>

                    <div className="p-4 space-y-3">
                      <input
                        value={form.title}
                        onChange={e => setForm(f => ({...f, title:e.target.value}))}
                        placeholder="Topic title..."
                        className="w-full bg-dark-700 border border-dark-500 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600"/>

                      <button
                        onClick={generateAINote}
                        disabled={generating || !form.title.trim()}
                        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-40"
                        style={{ background:'rgba(123,97,255,0.1)', color:'#7B61FF', border:'1px solid rgba(123,97,255,0.3)' }}>
                        {generating ? (
                          <>
                            <div className="w-3 h-3 border-2 border-secondary border-t-transparent rounded-full animate-spin"/>
                            Generating...
                          </>
                        ) : (
                          <><Zap size={11}/> ✨ AI Generate Notes</>
                        )}
                      </button>

                      <div className="flex flex-wrap gap-1">
                        {TOPICS.slice(1).map(t => (
                          <button key={t}
                            onClick={() => setForm(f => ({...f, topic:t}))}
                            className="px-2 py-0.5 rounded-lg text-xs transition-all"
                            style={form.topic === t ? {
                              background:'#00FF94', color:'#050508', fontWeight:'bold',
                            } : {
                              background:'rgba(18,18,26,0.8)',
                              color:'#555',
                              border:'1px solid rgba(34,34,51,0.5)',
                            }}>
                            {t}
                          </button>
                        ))}
                      </div>

                      <textarea
                        value={form.content}
                        onChange={e => setForm(f => ({...f, content:e.target.value}))}
                        placeholder="Theory, concepts, explanations..."
                        rows={6}
                        className="w-full bg-dark-700 border border-dark-500 rounded-xl px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 resize-none"/>

                      <button
                        onClick={() => setShowCode(!showCode)}
                        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-primary transition-colors">
                        <Code size={11}/>
                        {showCode ? 'Hide code' : '+ Add code snippet'}
                      </button>

                      {showCode && (
                        <div className="space-y-2">
                          <select
                            value={form.code_language}
                            onChange={e => setForm(f => ({...f, code_language:e.target.value}))}
                            className="w-full bg-dark-700 border border-dark-500 rounded-lg px-3 py-1.5 text-xs text-gray-300">
                            {['javascript','python','java','cpp','sql','bash','typescript','kotlin'].map(l => (
                              <option key={l} value={l}>{l}</option>
                            ))}
                          </select>
                          <textarea
                            value={form.code_snippet}
                            onChange={e => setForm(f => ({...f, code_snippet:e.target.value}))}
                            placeholder="// Code here..."
                            rows={8}
                            className="w-full px-3 py-2.5 text-xs font-mono text-gray-300 placeholder-gray-600 resize-none rounded-xl"
                            style={{ background:'#020205', border:'1px solid rgba(42,42,63,0.6)' }}
                            onKeyDown={e => {
                              if (e.key === 'Tab') {
                                e.preventDefault();
                                const s = e.target.selectionStart;
                                const v = form.code_snippet;
                                const nv = v.substring(0,s) + '  ' + v.substring(e.target.selectionEnd);
                                setForm(f => ({...f, code_snippet:nv}));
                                setTimeout(() => e.target.setSelectionRange(s+2,s+2), 0);
                              }
                            }}
                            spellCheck={false}/>
                        </div>
                      )}

                      <button onClick={saveNote} disabled={saving}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm text-dark-900 disabled:opacity-50"
                        style={{ background:'#00FF94', boxShadow:'0 0 12px rgba(0,255,148,0.25)' }}>
                        {saving ? (
                          <div className="w-4 h-4 border-2 border-dark-900 border-t-transparent rounded-full animate-spin"/>
                        ) : (
                          <><Save size={13}/> Save Note</>
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Notes;
