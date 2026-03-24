/**
 * Seed script — run with: npx prisma db seed
 * Creates sample users, categories, tags, 8 courses with rich lessons, reviews, and enrollments.
 */
import { PrismaClient, Role, LessonType, ContentStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ── Helpers ────────────────────────────────────────────────────────────────────

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ── Rich text content factory ──────────────────────────────────────────────────

const LESSON_CONTENT: Record<string, string[]> = {
  "Web Development": [
    `Welcome to the fundamentals of web development! The web is built on three core technologies that every developer must master.

HTML provides the structure — it defines what content appears on a page. Think of it as the skeleton of a website: headings, paragraphs, links, images, and forms.

CSS handles the presentation — colors, fonts, layouts, spacing, and animations. It transforms raw HTML into visually appealing pages that users enjoy interacting with.

JavaScript adds behavior — form validation, dynamic content loading, interactive elements, and communication with servers. It brings static pages to life.

Together, these three technologies form the foundation of everything you see in your browser. Whether you want to build simple landing pages or complex web applications, mastering this trio is essential.

In this course, we start from absolute zero. No prior coding experience is required. By the end, you'll be able to build responsive, interactive websites from scratch.`,

    `Understanding the Document Object Model (DOM) is crucial for web development. The DOM is a programming interface that represents HTML as a tree of objects.

Every element on a page — every paragraph, every button, every image — is a node in this tree. JavaScript can traverse, modify, add, and remove these nodes dynamically.

Key DOM methods you'll use every day:
• document.querySelector() — find elements using CSS selectors
• element.addEventListener() — respond to user interactions
• element.textContent — read or change text
• element.classList — add, remove, or toggle CSS classes
• document.createElement() — create new elements programmatically

Mastering the DOM is what separates someone who "knows HTML" from a true web developer. It lets you create dynamic experiences where the page responds to every click, keystroke, and scroll.`,

    `CSS Flexbox and Grid are modern layout systems that have revolutionized how we build web pages.

Flexbox is perfect for one-dimensional layouts — arranging items in a row or column. It handles alignment, distribution, and ordering with simple properties like justify-content, align-items, and flex-direction.

CSS Grid, on the other hand, excels at two-dimensional layouts. It lets you define rows and columns simultaneously, creating complex grid-based designs with grid-template-columns, grid-template-rows, and grid-area.

When to use Flexbox:
• Navigation bars and menus
• Card layouts that wrap
• Centering content vertically and horizontally
• Spacing items evenly in a row

When to use Grid:
• Full page layouts with header, sidebar, main, footer
• Photo galleries with varying sizes
• Dashboard-style layouts
• Any design with both row and column structure

Pro tip: You can nest Flexbox inside Grid and vice versa. The best layouts often combine both.`,

    `Responsive design ensures your website looks great on every device — from phones to ultra-wide monitors.

The key tool is CSS media queries. They let you apply different styles based on screen size:

@media (max-width: 768px) {
  .sidebar { display: none; }
  .main { width: 100%; }
}

But modern responsive design goes beyond media queries. Here are the essential techniques:

1. Fluid typography — use clamp() for font sizes that scale smoothly
2. Flexible images — max-width: 100% prevents images from overflowing
3. CSS Grid auto-fit — create grids that automatically adjust column count
4. Container queries — style components based on their container, not the viewport
5. Mobile-first approach — start with mobile styles, then add complexity for larger screens

A responsive website isn't just about fitting content on screen — it's about providing the best possible experience for each device. Touch targets should be larger on mobile, navigation should adapt, and content priority should shift.`,

    `Forms are how users interact with your web application — logging in, signing up, searching, making purchases, and providing feedback.

Building great forms requires attention to three areas:

Semantics: Use the right input types (email, tel, number, date) so browsers provide the appropriate keyboard and validation. Labels should be explicitly linked to inputs with the "for" attribute.

Validation: HTML5 provides built-in validation with attributes like required, minlength, maxlength, pattern, and type. For custom validation, JavaScript's Constraint Validation API gives you full control.

Accessibility: Every form control needs a visible label. Error messages should be associated with the relevant field. Focus management should guide users through the form logically. Screen readers should be able to navigate and understand the form completely.

Advanced techniques include multi-step forms, dynamic field visibility, autosave with debouncing, and real-time validation feedback.`,
  ],

  "React & Next.js": [
    `React is a JavaScript library for building user interfaces. Created by Facebook, it has become the most popular frontend framework in the world.

The core idea behind React is simple: build your UI from small, reusable pieces called components. Each component manages its own state and renders based on that state.

function Greeting({ name }) {
  return <h1>Hello, {name}!</h1>;
}

This is a React component. It takes "name" as a prop and renders a heading. You can use it anywhere: <Greeting name="World" />.

React uses a Virtual DOM — a lightweight copy of the real DOM. When state changes, React diffs the Virtual DOM against the real DOM and applies only the necessary updates. This makes React fast.

The modern React ecosystem revolves around hooks — functions that let you "hook into" React features:
• useState — manage component state
• useEffect — handle side effects (API calls, subscriptions)
• useContext — share data without prop drilling
• useRef — access DOM elements directly
• useMemo / useCallback — optimize performance

By the end of this course, you'll think in React — breaking UIs into components, managing state effectively, and building production-ready applications.`,

    `React Hooks changed everything. Before hooks, you needed class components for state and lifecycle methods. Now, function components can do it all.

useState is the most fundamental hook. It gives your component memory:

const [count, setCount] = useState(0);

Every time you call setCount, React re-renders the component with the new value. State is isolated to each component instance — if you render two counters, they each have their own independent count.

useEffect handles side effects — things that happen outside of rendering:

useEffect(() => {
  document.title = "You clicked " + count + " times";
}, [count]);

The dependency array [count] tells React to re-run this effect only when count changes. An empty array [] means "run once on mount." No array means "run after every render."

Common useEffect patterns:
• Fetching data from an API
• Setting up event listeners (and cleaning them up)
• Subscribing to real-time data sources
• Syncing state with localStorage
• Animating elements after they mount

Understanding when effects run — and when they clean up — is essential for writing bug-free React code.`,

    `Building a full-stack application with Next.js gives you the best of both worlds: React's component model with server-side rendering, API routes, and file-based routing.

Next.js 14+ introduces the App Router with React Server Components. This is a paradigm shift: components run on the server by default, reducing the JavaScript sent to the browser.

Server Components can:
• Query databases directly (no API needed)
• Access the file system
• Keep secrets and API keys secure
• Render faster with zero client JavaScript

Client Components (marked with "use client") handle interactivity:
• User input and form handling
• Browser APIs (localStorage, geolocation)
• State management with hooks
• Real-time updates

The pattern is: fetch data in Server Components, pass it to Client Components for interactivity. This gives you optimal performance and developer experience.

API Routes let you build your backend inside your Next.js project. Need a REST endpoint for form submissions, webhooks, or third-party integrations? Just create a file in app/api/ and export GET, POST, PUT, or DELETE handlers.`,

    `State management in React applications grows complex as your app scales. Let's explore the patterns from simple to advanced.

Local state (useState) is perfect for UI-specific state: form inputs, toggle states, selected items. Keep state as close to where it's used as possible.

Lifting state up handles shared state between siblings. Move the state to the closest common parent and pass it down as props.

Context API (useContext) eliminates prop drilling for truly global state: themes, authentication, locale. But be careful — every context consumer re-renders when the context value changes.

For complex state logic, useReducer provides Redux-like patterns without external libraries:

const [state, dispatch] = useReducer(reducer, initialState);

External solutions like Zustand, Jotai, or Redux Toolkit are appropriate when:
• State is shared across many unrelated components
• State updates follow complex business logic
• You need middleware (logging, persistence)
• Server state needs caching and synchronization

For server state (API data), React Query or SWR are game-changers. They handle caching, revalidation, optimistic updates, and error retries automatically.`,

    `Performance optimization in React is about preventing unnecessary work. React is fast by default, but as your app grows, you need to be intentional.

React.memo wraps a component to skip re-rendering if its props haven't changed. Use it for expensive components that receive stable props.

useMemo caches the result of expensive calculations:

const sorted = useMemo(
  () => items.sort((a, b) => a.name.localeCompare(b.name)),
  [items]
);

useCallback caches a function reference, preventing child components from re-rendering when the parent renders:

const handleClick = useCallback(() => {
  setCount(c => c + 1);
}, []);

Code splitting with React.lazy and dynamic imports reduces your initial bundle size. Only load components when they're needed.

Virtualization (react-window, react-virtuoso) renders only visible items in long lists — instead of 10,000 DOM nodes, you render maybe 20.

Profiling with React DevTools shows exactly which components render, how long they take, and why they re-rendered. Always measure before optimizing.`,
  ],

  "Python Programming": [
    `Python is one of the most versatile programming languages in the world. From web development to data science, machine learning to automation, Python does it all with clean, readable syntax.

What makes Python special is its philosophy: "There should be one — and preferably only one — obvious way to do it." This means Python code tends to be readable and consistent across projects.

Variables in Python don't need type declarations:

name = "Alice"
age = 30
pi = 3.14159
is_student = True

Python uses indentation instead of curly braces. This enforces clean code structure:

if age >= 18:
    print(f"{name} is an adult")
else:
    print(f"{name} is a minor")

Data structures are powerful and built-in:
• Lists — ordered, mutable: [1, 2, 3]
• Tuples — ordered, immutable: (1, 2, 3)
• Dictionaries — key-value pairs: {"name": "Alice", "age": 30}
• Sets — unordered, unique items: {1, 2, 3}

Python's standard library is famously described as "batteries included" — it comes with modules for file I/O, HTTP requests, JSON parsing, regular expressions, testing, and much more.`,

    `Functions in Python are first-class citizens — they can be assigned to variables, passed as arguments, and returned from other functions.

def greet(name, greeting="Hello"):
    return f"{greeting}, {name}!"

Python supports multiple programming paradigms. Object-Oriented Programming with classes:

class Dog:
    def __init__(self, name, breed):
        self.name = name
        self.breed = breed
    
    def bark(self):
        return f"{self.name} says Woof!"

Functional programming with map, filter, reduce, and lambda:

squares = list(map(lambda x: x**2, range(10)))
evens = list(filter(lambda x: x % 2 == 0, range(20)))

List comprehensions are Python's superpower — concise, readable, and fast:

[x**2 for x in range(10) if x % 2 == 0]  # [0, 4, 16, 36, 64]

Decorators let you modify function behavior without changing the function itself:

@timer
def slow_function():
    time.sleep(2)

Context managers (with statement) ensure proper resource cleanup:

with open("data.txt", "r") as f:
    content = f.read()

These patterns make Python code elegant, maintainable, and fun to write.`,

    `File handling and data processing are among Python's greatest strengths.

Reading and writing files is straightforward:

with open("data.csv", "r") as f:
    for line in f:
        fields = line.strip().split(",")
        process(fields)

For CSV files, Python's csv module handles edge cases like quoted fields and different delimiters. For JSON, the json module provides dumps() and loads() for serialization.

Working with APIs is simple with the requests library:

import requests
response = requests.get("https://api.example.com/data")
data = response.json()

For data analysis, pandas is the industry standard. It provides DataFrame — a table-like structure that makes data manipulation intuitive. You can filter, group, join, reshape, and visualize data with just a few lines of code.

Regular expressions (re module) handle text pattern matching. Error handling with try/except ensures your programs are robust. And Python's logging module provides configurable logging for production applications.

These skills form the foundation for real-world Python development — from scripts that automate your workflow to applications that process millions of records.`,

    `Testing is not optional — it's a professional skill that separates hobbyist code from production-ready software.

Python's unittest module provides a solid foundation:

import unittest

class TestCalculator(unittest.TestCase):
    def test_add(self):
        self.assertEqual(add(2, 3), 5)
    
    def test_divide_by_zero(self):
        with self.assertRaises(ZeroDivisionError):
            divide(1, 0)

pytest is more popular and Pythonic — tests are just functions with assert:

def test_add():
    assert add(2, 3) == 5

Fixtures provide test setup: database connections, temporary files, mock objects. Parametrize lets you run the same test with different inputs. Markers let you categorize tests (slow, integration, smoke).

Test coverage (coverage.py) shows which lines of code are exercised by tests. Aim for high coverage, but understand that 100% coverage doesn't mean zero bugs — it means every line ran at least once.

Mock objects (unittest.mock) let you isolate units by replacing dependencies with controlled fakes. This is essential for testing code that calls APIs, databases, or external services.`,
  ],

  "Data Science": [
    `Data Science is the art of extracting insights and knowledge from data. It combines statistics, programming, and domain expertise to solve real-world problems.

The data science workflow follows a clear pipeline:
1. Question formulation — What do you want to learn?
2. Data collection — Gather raw data from various sources
3. Data cleaning — Handle missing values, outliers, and inconsistencies
4. Exploratory analysis — Understand patterns with statistics and visualizations
5. Modeling — Apply algorithms to make predictions or classifications
6. Evaluation — Measure model performance with appropriate metrics
7. Communication — Present findings clearly to stakeholders

Python's data science stack is the industry standard:
• NumPy — fast numerical computing with arrays
• pandas — data manipulation and analysis
• Matplotlib & Seaborn — data visualization
• scikit-learn — machine learning algorithms
• Jupyter Notebooks — interactive development environment

The most important skill in data science isn't coding — it's asking the right questions. A perfectly accurate model that answers the wrong question is worthless. Start with the business problem, then work backwards to the data and technique.`,

    `pandas is the workhorse of data science in Python. It provides two main data structures: Series (one-dimensional) and DataFrame (two-dimensional, like a spreadsheet).

Creating a DataFrame:

import pandas as pd

df = pd.DataFrame({
    "name": ["Alice", "Bob", "Charlie", "Diana"],
    "age": [25, 30, 35, 28],
    "salary": [50000, 75000, 90000, 65000],
    "department": ["Engineering", "Marketing", "Engineering", "Sales"]
})

Essential operations:

# Filtering
senior = df[df["age"] > 30]

# Grouping and aggregation
dept_avg = df.groupby("department")["salary"].mean()

# Sorting
df.sort_values("salary", ascending=False)

# New columns
df["bonus"] = df["salary"] * 0.1

# Handling missing data
df.fillna(0)
df.dropna()

# Merging datasets
pd.merge(employees, departments, on="dept_id")

# Pivot tables
pd.pivot_table(df, values="salary", index="department", aggfunc="mean")

pandas is incredibly powerful — you can clean, transform, and analyze millions of rows with just a few lines of code. Mastering it is essential for any data professional.`,

    `Data visualization transforms numbers into insights. A well-designed chart can communicate in seconds what would take paragraphs to explain.

Matplotlib is Python's foundation for visualization:

import matplotlib.pyplot as plt

plt.figure(figsize=(10, 6))
plt.plot(dates, prices, linewidth=2)
plt.title("Stock Price Over Time")
plt.xlabel("Date")
plt.ylabel("Price ($)")
plt.grid(True, alpha=0.3)
plt.show()

Seaborn builds on Matplotlib with beautiful statistical plots:

import seaborn as sns

# Distribution plot
sns.histplot(data=df, x="salary", kde=True)

# Relationship plot
sns.scatterplot(data=df, x="experience", y="salary", hue="department")

# Correlation heatmap
sns.heatmap(df.corr(), annot=True, cmap="coolwarm")

Choosing the right chart type:
• Line chart — trends over time
• Bar chart — comparing categories
• Scatter plot — relationships between variables
• Histogram — distribution of a single variable
• Box plot — distribution and outliers
• Heatmap — correlations or patterns in matrices

The best visualizations tell a story. They highlight what's important, provide context, and guide the viewer to the insight.`,

    `Machine Learning is the application of statistical models that learn patterns from data and make predictions on new, unseen data.

Supervised learning uses labeled data to train models:

from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score

# Split data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)

# Train model
model = RandomForestClassifier(n_estimators=100)
model.fit(X_train, y_train)

# Predict and evaluate
predictions = model.predict(X_test)
print(f"Accuracy: {accuracy_score(y_test, predictions):.2%}")

Common algorithms:
• Linear/Logistic Regression — interpretable baselines
• Decision Trees/Random Forests — handle non-linear relationships
• Support Vector Machines — effective in high dimensions
• Gradient Boosting (XGBoost, LightGBM) — top performers in competitions
• Neural Networks — best for images, text, and complex patterns

The machine learning workflow: prepare features, split data, train models, tune hyperparameters, evaluate with cross-validation, and deploy the best model. Always start simple and add complexity only when needed.`,
  ],

  "UI/UX Design": [
    `Great design is invisible. When an interface works perfectly, users don't notice the design — they just accomplish their goals effortlessly.

UI (User Interface) design focuses on the visual elements: colors, typography, spacing, icons, and layout. UX (User Experience) design focuses on the overall journey: how intuitive the flow is, how quickly users can complete tasks, and how the product makes them feel.

The fundamental principles of good design:

Hierarchy: Guide the user's eye through size, color, contrast, and spacing. The most important element should be most prominent.

Consistency: Use the same patterns throughout. If a blue button means "primary action" on one page, it should mean that everywhere.

Feedback: Every action should have a visible response. Clicked a button? Show a loading state. Submitted a form? Display a success message. Made an error? Highlight the problem clearly.

Simplicity: Remove everything that doesn't serve the user's goal. Every element should earn its place on the screen.

Accessibility: Design for everyone — including users with visual, motor, or cognitive impairments. This isn't optional; it's a fundamental requirement.`,

    `Color theory and typography are the two most impactful tools in a designer's toolkit.

Color creates emotional responses: blue conveys trust, red signals urgency, green suggests success. But color is about more than aesthetics — it establishes hierarchy, groups related elements, and communicates state.

Building a color palette:
1. Choose a primary brand color
2. Generate complementary, analogous, or triadic variants
3. Define semantic colors: success (green), warning (amber), error (red), info (blue)
4. Create neutral shades for text, backgrounds, and borders
5. Ensure WCAG contrast ratios: 4.5:1 for normal text, 3:1 for large text

Typography is equally powerful. Type choices communicate personality: serif fonts feel traditional, sans-serif feels modern, monospace feels technical.

Type scale creates rhythm. Use a consistent scale like 1.25 (Major Third):
12px → 15px → 19px → 24px → 30px → 37px

Line height affects readability dramatically. Body text needs 1.5–1.75 line height. Headings can use tighter spacing (1.1–1.3).

Limit yourself to 2 fonts maximum: one for headings, one for body. Use weight and size variations instead of adding more typefaces.`,

    `Prototyping and user testing transform assumptions into evidence. No matter how experienced you are, you cannot predict how real users will interact with your design.

The prototyping spectrum:
• Paper sketches — fastest, cheapest, disposable
• Wireframes — low-fidelity digital layouts showing structure
• Mockups — high-fidelity designs showing visual details
• Interactive prototypes — clickable simulations of the final product

Tools: Figma dominates the industry. It handles design, prototyping, collaboration, and handoff in one tool. Alternatives include Sketch (macOS) and Adobe XD.

User testing doesn't require a lab. Guerrilla testing with 5 users finds 85% of usability issues:

1. Define a task: "Find and purchase a React course"
2. Watch users attempt the task — no hints, no guidance
3. Ask them to think aloud as they navigate
4. Note where they hesitate, get confused, or make errors
5. Look for patterns across participants

Key metrics:
• Task completion rate — can users accomplish the goal?
• Time on task — how long does it take?
• Error rate — how many mistakes do they make?
• Satisfaction score — how do they feel about the experience?

The most valuable insight is often the simplest: watch someone use your design, and you'll immediately see what needs to change.`,
  ],

  "DevOps & Cloud": [
    `DevOps bridges the gap between development and operations, enabling teams to deliver software faster, more reliably, and with better quality.

The DevOps lifecycle:
1. Plan — Define features and requirements
2. Code — Write and review code
3. Build — Compile and package the application
4. Test — Run automated tests at every level
5. Release — Prepare for deployment
6. Deploy — Push to production environments
7. Operate — Monitor and maintain the system
8. Monitor — Collect metrics, logs, and traces

Core practices:

Continuous Integration (CI): Every code change triggers automated builds and tests. Developers integrate frequently — at least daily. This catches bugs early and keeps the codebase healthy.

Continuous Delivery (CD): Code that passes CI is automatically deployable. The deployment process is fully automated, repeatable, and auditable. You should be able to deploy any version at any time.

Infrastructure as Code (IaC): Define infrastructure in version-controlled files. Terraform, CloudFormation, or Pulumi let you create, modify, and destroy infrastructure programmatically.

The cultural shift is as important as the tooling. DevOps requires shared ownership, blameless postmortems, and a commitment to continuous improvement.`,

    `Containers revolutionized how we build, ship, and run applications. Docker is the standard container runtime.

A container packages your application with everything it needs: code, runtime, libraries, and configuration. It runs identically everywhere — your laptop, staging, production, any cloud provider.

Dockerfile example:

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]

Docker Compose orchestrates multi-container applications:

version: "3.8"
services:
  app:
    build: .
    ports: ["3000:3000"]
    depends_on: [db, redis]
  db:
    image: postgres:16
    volumes: [pgdata:/var/lib/postgresql/data]
  redis:
    image: redis:7-alpine

Kubernetes (K8s) takes container orchestration to production scale:
• Automatic scaling based on load
• Self-healing — restarts failed containers
• Rolling updates with zero downtime
• Service discovery and load balancing
• Secret management and configuration

The container ecosystem has transformed deployment from "it works on my machine" to "it works everywhere, every time."`,

    `Cloud platforms provide on-demand computing resources — servers, databases, storage, networking, and hundreds of managed services.

AWS (Amazon Web Services) is the market leader with 200+ services. Key services:
• EC2 — virtual servers
• S3 — object storage
• RDS — managed databases
• Lambda — serverless functions
• CloudFront — CDN
• EKS — managed Kubernetes

Azure and Google Cloud offer comparable services with different strengths. Multi-cloud strategies are increasingly common.

Serverless computing is the next evolution. Instead of managing servers, you write functions that run in response to events:

// AWS Lambda function
export const handler = async (event) => {
  const data = JSON.parse(event.body);
  await database.insert(data);
  return { statusCode: 200, body: "Success" };
};

You pay only for execution time — no idle server costs. Serverless scales automatically from zero to millions of requests.

Cost management is critical in the cloud. Use reserved instances for predictable workloads, spot instances for fault-tolerant tasks, and serverless for variable loads. Set up billing alerts and regularly review usage with cost analysis tools.`,
  ],

  "Mobile Development": [
    `Mobile development has converged on two dominant approaches: native development and cross-platform frameworks.

Native development means building separate apps for iOS (Swift/SwiftUI) and Android (Kotlin/Jetpack Compose). You get full platform access, best performance, and native look-and-feel. The trade-off is maintaining two codebases.

Cross-platform frameworks let you write once, deploy everywhere:

React Native uses React to build truly native mobile apps. Your JavaScript code renders native components — not web views.

import { View, Text, TouchableOpacity } from 'react-native';

function App() {
  const [count, setCount] = useState(0);
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Count: {count}</Text>
      <TouchableOpacity onPress={() => setCount(c => c + 1)}>
        <Text>Increment</Text>
      </TouchableOpacity>
    </View>
  );
}

Flutter uses Dart and its own rendering engine to create beautiful, high-performance apps. It renders every pixel itself, giving you complete control over the UI.

The choice depends on your project: need platform-specific features? Go native. Building a business app with standard UI? Cross-platform saves significant development time and cost.`,

    `Mobile UX differs fundamentally from web UX. Users interact with thumbs, not mice. Screens are smaller. Attention spans are shorter. Network connections are unreliable.

Essential mobile UX principles:

Touch targets: Minimum 44x44 points (Apple) or 48x48dp (Android). Fingers are imprecise — small buttons frustrate users.

Thumb zones: Place primary actions within easy thumb reach. The bottom of the screen is most accessible for one-handed use.

Navigation patterns:
• Tab bar (bottom) — 3-5 primary sections
• Navigation stack — drill into content, swipe back
• Drawer menu — secondary navigation and settings
• Modal sheets — focused tasks that overlay the main content

Performance: Mobile users expect instant responses. Show skeleton screens while loading. Cache data aggressively. Optimize images for mobile networks.

Offline support: Design for intermittent connectivity. Queue actions, sync when online, and show clear offline indicators.

Gestures: Swipe to delete, pull to refresh, pinch to zoom — these feel natural because they mirror physical interactions. But always provide visible alternatives for discoverability.`,
  ],

  "Cybersecurity": [
    `Cybersecurity is the practice of protecting systems, networks, and data from digital attacks. As our world becomes increasingly connected, security skills are more critical than ever.

The CIA Triad — the foundation of information security:
• Confidentiality — Only authorized users can access data
• Integrity — Data is accurate and unmodified
• Availability — Systems are accessible when needed

Common attack vectors:

Phishing — Fraudulent communications that trick users into revealing credentials or installing malware. Still the #1 attack method.

SQL Injection — Manipulating database queries through user input:
' OR '1'='1' --
Prevention: Use parameterized queries, never concatenate user input.

Cross-Site Scripting (XSS) — Injecting malicious scripts into web pages viewed by other users.
Prevention: Sanitize output, use Content Security Policy headers.

Cross-Site Request Forgery (CSRF) — Tricking authenticated users into making unintended requests.
Prevention: Use anti-CSRF tokens, SameSite cookies.

The security mindset: assume everything is a potential attack vector. Trust nothing from the client side. Validate all input. Encrypt sensitive data. Apply the principle of least privilege. Defense in depth — multiple layers of security, so if one fails, others still protect.`,

    `Cryptography is the mathematical foundation of digital security. It enables secure communication, data protection, authentication, and digital signatures.

Symmetric encryption uses the same key for encryption and decryption:
• AES-256 — current gold standard, used everywhere
• Fast for large data: file encryption, database encryption, VPN tunnels

Asymmetric (public-key) encryption uses a key pair:
• Public key encrypts, private key decrypts
• RSA, ECDSA — used for key exchange, digital signatures, TLS/SSL
• Slower but solves the key distribution problem

Hashing creates a fixed-size fingerprint of data:
• SHA-256 — general-purpose hashing
• bcrypt, Argon2 — password hashing (intentionally slow)
• Hashes are one-way: you can't recover the original data

TLS (Transport Layer Security) secures web communication:
1. Client and server negotiate cipher suites
2. Server presents its certificate (signed by a trusted CA)
3. Key exchange establishes a shared session key
4. All subsequent communication is symmetrically encrypted

Password best practices:
• Never store passwords in plain text — always hash with bcrypt or Argon2
• Salt each password with a unique random value
• Enforce minimum complexity but don't over-restrict
• Implement rate limiting and account lockout
• Support multi-factor authentication (MFA)`,
  ],
};

// ── Course definitions ─────────────────────────────────────────────────────────

interface CourseDef {
  title: string;
  desc: string;
  shortDesc: string;
  thumb: string;
  category: string;
  tags: string[];
  level: string;
  price: number | null;
  discountPrice: number | null;
  isFree: boolean;
}

const COURSES: CourseDef[] = [
  {
    title: "Web Development Fundamentals",
    desc: "Learn the core building blocks of the web: HTML, CSS, and JavaScript. This comprehensive course takes you from absolute zero to building responsive, interactive websites. You'll master semantic HTML5, modern CSS layouts (Flexbox & Grid), responsive design, JavaScript fundamentals, DOM manipulation, and form handling. Perfect for beginners who want to start their coding journey with a solid foundation.",
    shortDesc: "Master HTML, CSS, and JavaScript from scratch.",
    thumb: "https://images.unsplash.com/photo-1593720213428-28a5b9e94613?w=800",
    category: "Web Development",
    tags: ["html", "css", "javascript"],
    level: "beginner",
    price: null,
    discountPrice: null,
    isFree: true,
  },
  {
    title: "React & Next.js Mastery",
    desc: "Master React from hooks to advanced patterns, then level up with Next.js. This course covers components, props, state management, hooks (useState, useEffect, useContext, useReducer), context API, performance optimization, React Server Components, and full-stack development with Next.js App Router. Build real-world applications with modern best practices.",
    shortDesc: "Go from React beginner to production-ready developer.",
    thumb: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800",
    category: "React & Next.js",
    tags: ["javascript", "typescript", "react", "nextjs"],
    level: "intermediate",
    price: 2999,
    discountPrice: 1499,
    isFree: false,
  },
  {
    title: "Python Programming Complete Course",
    desc: "From Python basics to advanced programming. This course covers variables, data structures, control flow, functions, OOP, file handling, error handling, testing, APIs, and data processing. You'll build practical projects including a web scraper, a REST API, a data analysis pipeline, and automated testing suites. Perfect for developers who want to add Python to their toolkit.",
    shortDesc: "Learn Python from zero to professional developer.",
    thumb: "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=800",
    category: "Python Programming",
    tags: ["python", "automation", "backend"],
    level: "beginner",
    price: 1999,
    discountPrice: 999,
    isFree: false,
  },
  {
    title: "Data Science with Python",
    desc: "Become a data scientist with Python. Master NumPy, pandas, Matplotlib, Seaborn, and scikit-learn. This course covers the full data science pipeline: data collection, cleaning, exploratory analysis, visualization, machine learning (classification, regression, clustering), and model evaluation. Work with real datasets and build a portfolio of data science projects.",
    shortDesc: "Master data analysis, visualization, and machine learning.",
    thumb: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800",
    category: "Data Science",
    tags: ["python", "data-science", "machine-learning"],
    level: "intermediate",
    price: 3499,
    discountPrice: 1999,
    isFree: false,
  },
  {
    title: "UI/UX Design Fundamentals",
    desc: "Learn the principles of great design. This course covers design thinking, user research, wireframing, prototyping, visual design (color theory, typography, layout), interaction design, Figma mastery, and user testing. You'll work on real design projects and build a professional portfolio. No prior design experience required.",
    shortDesc: "Design beautiful, user-friendly interfaces from scratch.",
    thumb: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800",
    category: "UI/UX Design",
    tags: ["design", "figma", "ux"],
    level: "beginner",
    price: 1499,
    discountPrice: null,
    isFree: false,
  },
  {
    title: "DevOps & Cloud Engineering",
    desc: "Master modern DevOps practices and cloud engineering. This course covers CI/CD pipelines, Docker & Kubernetes, Infrastructure as Code (Terraform), cloud platforms (AWS/Azure/GCP), monitoring & observability, serverless computing, and security best practices. Learn to build, deploy, and scale production applications with confidence.",
    shortDesc: "Build, deploy, and scale applications in the cloud.",
    thumb: "https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=800",
    category: "DevOps & Cloud",
    tags: ["devops", "docker", "kubernetes", "aws"],
    level: "advanced",
    price: 3999,
    discountPrice: 2499,
    isFree: false,
  },
  {
    title: "Mobile App Development with React Native",
    desc: "Build cross-platform mobile apps with React Native. This course covers React Native fundamentals, navigation, state management, native modules, animations, performance optimization, push notifications, offline support, and app store deployment. Build real mobile apps for iOS and Android from a single JavaScript codebase.",
    shortDesc: "Create iOS and Android apps with React Native.",
    thumb: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800",
    category: "Mobile Development",
    tags: ["react-native", "javascript", "mobile"],
    level: "intermediate",
    price: 2499,
    discountPrice: 1299,
    isFree: false,
  },
  {
    title: "Cybersecurity Essentials",
    desc: "Protect systems, networks, and data from cyber threats. This course covers security fundamentals (CIA triad), common attack vectors (XSS, SQL injection, CSRF, phishing), cryptography (symmetric, asymmetric, hashing, TLS), network security, web application security, penetration testing basics, and security best practices for developers.",
    shortDesc: "Learn to defend against modern cyber threats.",
    thumb: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800",
    category: "Cybersecurity",
    tags: ["security", "networking", "crypto"],
    level: "intermediate",
    price: null,
    discountPrice: null,
    isFree: true,
  },
];

const REVIEW_COMMENTS = [
  "Excellent course! Very well structured and the explanations are crystal clear.",
  "Great content but I wish there were more practical exercises.",
  "The instructor explains complex topics in a very approachable way. Highly recommended!",
  "Good foundational course. Helped me land my first developer job!",
  "Content is solid but some lessons could use more real-world examples.",
  "This course changed my career trajectory. Worth every penny.",
  "Well-paced and comprehensive. The projects really reinforce the concepts.",
  "A bit fast-paced for absolute beginners but overall great quality.",
  "Love the hands-on approach. I built real projects while learning.",
  "The best course on this topic I've found online. Detailed and practical.",
  "Solid course, though some sections feel a bit dated.",
  "Clear explanations with good examples. Perfect for my level.",
  "Thorough coverage of the fundamentals. I feel much more confident now.",
  "The instructor really knows their stuff. Engaging and informative.",
  "I've taken many courses and this is by far one of the best.",
];

const STUDENT_NAMES = [
  "Priya Sharma", "Rahul Patel", "Ananya Singh", "Vikram Gupta",
  "Neha Verma", "Arjun Reddy", "Kavya Iyer", "Rohit Mehta",
  "Simran Kaur", "Aditya Joshi", "Divya Nair", "Karan Malhotra",
  "Pooja Deshmukh", "Manish Kumar", "Shreya Bhat",
];

// ── Main seed function ─────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Seeding database...\n");

  // ── Users ──────────────────────────────────────────────────────────────────
  const [adminPwd, instrPwd, studentPwd] = await Promise.all([
    bcrypt.hash("admin123", 12),
    bcrypt.hash("instructor123", 12),
    bcrypt.hash("student123", 12),
  ]);

  const admin = await prisma.user.upsert({
    where: { email: "admin@learnhub.dev" },
    update: {},
    create: { name: "Admin User", email: "admin@learnhub.dev", password: adminPwd, role: Role.ADMIN },
  });

  const instructor = await prisma.user.upsert({
    where: { email: "instructor@learnhub.dev" },
    update: {},
    create: {
      name: "Alex Instructor",
      email: "instructor@learnhub.dev",
      password: instrPwd,
      role: Role.INSTRUCTOR,
      headline: "Senior Full-Stack Developer & Educator",
      bio: "15 years of experience building scalable applications. Taught 50,000+ students worldwide. Passionate about making complex topics simple.",
    },
  });

  const instructor2 = await prisma.user.upsert({
    where: { email: "sarah@learnhub.dev" },
    update: {},
    create: {
      name: "Sarah Chen",
      email: "sarah@learnhub.dev",
      password: instrPwd,
      role: Role.INSTRUCTOR,
      headline: "Data Scientist & ML Engineer",
      bio: "Former Google ML Engineer. PhD in Computer Science. Specializes in making data science accessible to everyone.",
    },
  });

  // Create student users
  const students: Array<{ id: string; name: string }> = [];
  for (let i = 0; i < STUDENT_NAMES.length; i++) {
    const email = `student${i + 1}@learnhub.dev`;
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        name: STUDENT_NAMES[i],
        email,
        password: studentPwd,
        role: Role.STUDENT,
      },
    });
    students.push(user);
  }

  console.log(`  ✓ Created ${3 + students.length} users`);

  // ── Categories ─────────────────────────────────────────────────────────────
  const categoryMap: Record<string, string> = {};
  const categories = [
    { name: "Web Development", slug: "web-development", icon: "💻", color: "#7c3aed" },
    { name: "React & Next.js", slug: "react-nextjs", icon: "⚛️", color: "#0ea5e9" },
    { name: "Python Programming", slug: "python-programming", icon: "🐍", color: "#059669" },
    { name: "Data Science", slug: "data-science", icon: "📊", color: "#d97706" },
    { name: "UI/UX Design", slug: "ui-ux-design", icon: "🎨", color: "#ec4899" },
    { name: "DevOps & Cloud", slug: "devops-cloud", icon: "☁️", color: "#8b5cf6" },
    { name: "Mobile Development", slug: "mobile-development", icon: "📱", color: "#06b6d4" },
    { name: "Cybersecurity", slug: "cybersecurity", icon: "🔒", color: "#ef4444" },
  ];

  for (const cat of categories) {
    const created = await prisma.category.upsert({
      where: { name: cat.name },
      update: { slug: cat.slug, icon: cat.icon, color: cat.color },
      create: cat,
    });
    categoryMap[cat.name] = created.id;
  }
  console.log(`  ✓ Created ${categories.length} categories`);

  // ── Tags ───────────────────────────────────────────────────────────────────
  const tagMap: Record<string, string> = {};
  const allTags = [
    "html", "css", "javascript", "typescript", "react", "nextjs",
    "python", "automation", "backend", "data-science", "machine-learning",
    "design", "figma", "ux", "devops", "docker", "kubernetes", "aws",
    "react-native", "mobile", "security", "networking", "crypto",
  ];

  for (const t of allTags) {
    const created = await prisma.tag.upsert({
      where: { slug: t },
      update: {},
      create: { name: t.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()), slug: t },
    });
    tagMap[t] = created.id;
  }
  console.log(`  ✓ Created ${allTags.length} tags`);

  // ── Courses + Lessons ──────────────────────────────────────────────────────
  const courseIds: string[] = [];
  const allLessonIds: string[] = [];

  for (let ci = 0; ci < COURSES.length; ci++) {
    const c = COURSES[ci];
    const courseSlug = slug(c.title);
    const courseInstructor = ci < 4 ? instructor : ci < 6 ? instructor2 : instructor;
    const content = LESSON_CONTENT[c.category] ?? LESSON_CONTENT["Web Development"];
    const lessonCount = content.length;

    const course = await prisma.course.upsert({
      where: { slug: courseSlug },
      update: {},
      create: {
        title: c.title,
        slug: courseSlug,
        description: c.desc,
        shortDesc: c.shortDesc,
        thumbnail: c.thumb,
        status: ContentStatus.PUBLISHED,
        price: c.price,
        discountPrice: c.discountPrice,
        isFree: c.isFree,
        level: c.level,
        totalLessons: lessonCount,
        createdById: courseInstructor.id,
        categoryId: categoryMap[c.category],
      },
    });

    courseIds.push(course.id);

    // Tags
    await prisma.courseTag.createMany({
      skipDuplicates: true,
      data: c.tags.filter((t) => tagMap[t]).map((t) => ({ courseId: course.id, tagId: tagMap[t] })),
    });

    // Lessons
    const lessonTitles: Record<string, string[]> = {
      "Web Development": ["Introduction to Web Development", "Understanding the DOM", "CSS Flexbox & Grid Mastery", "Responsive Design Techniques", "HTML Forms & Validation"],
      "React & Next.js": ["Introduction to React", "React Hooks Deep Dive", "Full-Stack with Next.js", "State Management Patterns", "Performance Optimization"],
      "Python Programming": ["Python Fundamentals", "Functions & OOP in Python", "File Handling & Data Processing", "Testing in Python"],
      "Data Science": ["Introduction to Data Science", "Data Analysis with pandas", "Data Visualization Mastery", "Machine Learning Fundamentals"],
      "UI/UX Design": ["Design Principles & Fundamentals", "Color Theory & Typography", "Prototyping & User Testing"],
      "DevOps & Cloud": ["Introduction to DevOps", "Containers & Kubernetes", "Cloud Platforms & Serverless"],
      "Mobile Development": ["Mobile Development Overview", "Mobile UX Best Practices"],
      "Cybersecurity": ["Security Fundamentals", "Cryptography & Encryption"],
    };

    const titles = lessonTitles[c.category] ?? [];

    for (let li = 0; li < content.length; li++) {
      const lessonId = `lesson-${courseSlug}-${li + 1}`;
      const lessonType = li % 3 === 1 ? LessonType.VIDEO : LessonType.TEXT;

      await prisma.lesson.upsert({
        where: { id: lessonId },
        update: {},
        create: {
          id: lessonId,
          title: titles[li] ?? `Lesson ${li + 1}`,
          type: lessonType,
          content: lessonType === "VIDEO"
            ? "https://www.youtube.com/embed/dQw4w9WgXcQ"
            : content[li],
          order: li + 1,
          duration: rand(8, 45),
          isFree: li === 0,
          courseId: course.id,
        },
      });

      allLessonIds.push(lessonId);
    }

    console.log(`  ✓ Course: "${c.title}" — ${content.length} lessons`);
  }

  // ── Enrollments ────────────────────────────────────────────────────────────
  let enrollCount = 0;
  for (const student of students) {
    // Each student enrolls in 2–5 random courses
    const numCourses = rand(2, 5);
    const shuffled = [...courseIds].sort(() => Math.random() - 0.5);
    const enrolled = shuffled.slice(0, numCourses);

    for (const courseId of enrolled) {
      await prisma.enrollment.upsert({
        where: { userId_courseId: { userId: student.id, courseId } },
        update: {},
        create: { userId: student.id, courseId },
      });
      enrollCount++;
    }
  }
  console.log(`  ✓ Created ${enrollCount} enrollments`);

  // ── Lesson Progress ────────────────────────────────────────────────────────
  let progressCount = 0;
  for (const student of students.slice(0, 8)) {
    // First 8 students have progress on first 2 courses
    for (let ci = 0; ci < Math.min(2, courseIds.length); ci++) {
      const courseLessons = allLessonIds.filter((id) => id.startsWith(`lesson-${slug(COURSES[ci].title)}`));
      const completeLessons = courseLessons.slice(0, rand(1, courseLessons.length));

      for (const lessonId of completeLessons) {
        await prisma.lessonProgress.upsert({
          where: { userId_lessonId: { userId: student.id, lessonId } },
          update: {},
          create: {
            userId: student.id,
            lessonId,
            completed: true,
            completedAt: new Date(Date.now() - rand(1, 30) * 86400000),
          },
        });
        progressCount++;
      }
    }
  }
  console.log(`  ✓ Created ${progressCount} lesson progress records`);

  // ── Reviews ────────────────────────────────────────────────────────────────
  let reviewCount = 0;
  for (const student of students) {
    // Each student reviews 1–3 courses
    const numReviews = rand(1, 3);
    const shuffled = [...courseIds].sort(() => Math.random() - 0.5);

    for (let r = 0; r < numReviews; r++) {
      const courseId = shuffled[r];
      if (!courseId) break;

      await prisma.review.upsert({
        where: { userId_courseId: { userId: student.id, courseId } },
        update: {},
        create: {
          userId: student.id,
          courseId,
          rating: rand(3, 5),
          comment: pick(REVIEW_COMMENTS),
          helpful: rand(0, 12),
        },
      });
      reviewCount++;
    }
  }
  console.log(`  ✓ Created ${reviewCount} reviews`);

  // ── Coupons ────────────────────────────────────────────────────────────────
  await prisma.coupon.upsert({
    where: { code: "LAUNCH50" },
    update: {},
    create: { code: "LAUNCH50", description: "50% off launch discount", discountType: "PERCENTAGE", discount: 50, maxUses: 100 },
  });
  await prisma.coupon.upsert({
    where: { code: "WELCOME25" },
    update: {},
    create: { code: "WELCOME25", description: "25% off for new users", discountType: "PERCENTAGE", discount: 25, maxUses: 500 },
  });
  console.log(`  ✓ Created 2 coupons`);

  // ── Done ───────────────────────────────────────────────────────────────────
  console.log("\n✅ Seed complete!\n");
  console.log("  Accounts:");
  console.log("    Admin      → admin@learnhub.dev        / admin123");
  console.log("    Instructor → instructor@learnhub.dev   / instructor123");
  console.log("    Instructor → sarah@learnhub.dev        / instructor123");
  console.log(`    Students   → student1@learnhub.dev … student${students.length}@learnhub.dev / student123`);
  console.log("  Coupons: LAUNCH50 (50%), WELCOME25 (25%)");
  console.log(`  Courses: ${courseIds.length}, Enrollments: ${enrollCount}, Reviews: ${reviewCount}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
