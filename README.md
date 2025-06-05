# 🕵️ Dual-AI Detective Game

> **The World's First AI-Powered Detective Game with Visual Testimony Generation**

A revolutionary detective game that combines **two AI systems** (OpenAI GPT-4 and Anthropic Claude) to create dynamic mysteries with real-time character discovery and AI-generated visual scenes from testimony.

## 🌟 **Breakthrough Features**

### 🤖 **Dual-AI Intelligence System**
- **OpenAI GPT-4 (Storyteller AI)**: Generates rich narratives, character personalities, crime scenes, and handles natural language interrogations
- **Anthropic Claude (Logic AI)**: Analyzes evidence, maintains logical consistency, provides deductive reasoning assistance

### 🔍 **Dynamic Character Discovery** 
- **World's First**: Characters mentioned during interrogations automatically become available for questioning
- **Organic Investigation Growth**: Cases that start with 4-5 suspects can grow to 8-10+ through natural conversation
- **AI-Powered Lead Generation**: Realistic detective work where one lead opens multiple new leads

### 🎨 **AI-Generated Visual Scenes**
- **Crime Scene Visualization**: Every case gets an AI-generated crime scene image
- **Testimony Flashbacks**: When suspects describe events, those scenes are visualized in real-time
- **Visual Evidence Gallery**: Collect visual scenes as investigation evidence
- **Revolutionary Gaming**: First detective game with testimony-to-image generation

### 🎮 **Advanced Gameplay**
- **Natural Language Investigation**: Ask suspects anything - no scripted dialogue trees
- **Procedural Mystery Generation**: Every case is completely unique
- **Save/Load Functionality**: Continue investigations across sessions
- **Adaptive Difficulty**: AI adjusts complexity based on player performance

## 🏗️ **Architecture**

```
dual-ai-detective/
├── frontend/          # React.js application
│   ├── src/
│   │   ├── App.js     # Main game interface (750+ lines)
│   │   ├── App.css    # Tailwind styling with detective theme
│   │   └── index.js   # React entry point
│   └── package.json   # Frontend dependencies
├── backend/           # FastAPI Python backend
│   ├── server.py      # ⭐ MAIN API SERVER (750+ lines of FastAPI code)
│   ├── requirements.txt # Python dependencies
│   └── .env          # Environment variables (API keys)
├── main.py           # Entry point that imports backend/server.py
└── README.md         # This file
```

### **🔍 For Code Review Tools:**
- **Main Backend File**: `/app/backend/server.py` (FastAPI application)
- **Alternative Entry Point**: `/app/main.py` (imports server.py)
- **Main Frontend File**: `/app/frontend/src/App.js` (React application)

## 🚀 **Tech Stack**

### **Frontend**
- **React.js** - Modern UI framework
- **Tailwind CSS** - Utility-first styling with detective noir theme
- **JavaScript ES6+** - Modern JavaScript features

### **Backend**
- **FastAPI** - High-performance Python web framework
- **MongoDB** - Document database for case storage
- **Motor** - Async MongoDB driver

### **AI Services**
- **OpenAI GPT-4** - Creative storytelling and character generation
- **Anthropic Claude** - Logical analysis and deduction assistance
- **FAL.AI** - High-quality image generation for visual scenes

### **Deployment**
- **Kubernetes** - Container orchestration
- **Supervisor** - Process management
- **Nginx** - Web server and reverse proxy

## ⚡ **Quick Start**

### **Prerequisites**
- Node.js 18+ and Yarn
- Python 3.11+
- MongoDB
- API Keys for OpenAI, Anthropic, and FAL.AI

### **Environment Setup**
1. **Clone the repository**
```bash
git clone <repository-url>
cd dual-ai-detective
```

2. **Backend Setup**
```bash
cd backend
pip install -r requirements.txt

# Create .env file with your API keys
echo "MONGO_URL=mongodb://localhost:27017" > .env
echo "DB_NAME=detective_game" >> .env
echo "OPENAI_API_KEY=your_openai_key_here" >> .env
echo "ANTHROPIC_API_KEY=your_anthropic_key_here" >> .env
echo "FAL_KEY=your_fal_ai_key_here" >> .env
```

3. **Frontend Setup**
```bash
cd ../frontend
yarn install

# Create .env file
echo "REACT_APP_BACKEND_URL=http://localhost:8001" > .env
```

4. **Start Services**
```bash
# Terminal 1 - Backend
cd backend
python server.py

# Terminal 2 - Frontend  
cd frontend
yarn start
```

5. **Access the Game**
Open http://localhost:3000 in your browser

## 🎮 **How to Play**

### **🎯 Starting an Investigation**
1. Click "Start New Investigation" to generate a unique case
2. Wait for the dual-AI system to create your mystery (10-30 seconds)
3. Observe the AI-generated crime scene visualization

### **🔍 Investigating**
1. **Question Suspects**: Click on any character and ask natural language questions
2. **Discover New Leads**: Characters mentioned in conversations become available for questioning
3. **Collect Visual Evidence**: Descriptive testimony automatically generates visual scenes
4. **Take Notes**: Use the Detective Notebook to track findings
5. **Analyze Evidence**: Select evidence and submit theories for Claude's analysis

### **🧠 Advanced Features**
- **Dynamic Character Discovery**: Ask "Who else was around?" to discover new suspects
- **Visual Scene Generation**: Ask "What did you see?" to generate visual flashbacks
- **Save/Load**: Save progress and continue investigations later
- **Reference Panel**: Toggle detective info for quick access to all case details

## 🔑 **API Keys Required**

### **OpenAI API** (GPT-4)
- **Purpose**: Creative storytelling, character generation, dialogue
- **Get Key**: https://platform.openai.com/api-keys
- **Cost**: ~$0.01-0.03 per 1K tokens

### **Anthropic API** (Claude)
- **Purpose**: Logical analysis, evidence relationships, deduction
- **Get Key**: https://console.anthropic.com/
- **Cost**: ~$0.015-0.075 per 1K tokens

### **FAL.AI API** (Image Generation)
- **Purpose**: Crime scene and testimony visual generation
- **Get Key**: https://fal.ai/dashboard/keys
- **Cost**: ~$0.02-0.08 per image

## 🎨 **Innovation Highlights**

### **🏆 World Firsts**
- **First detective game with dual-AI intelligence**
- **First game with dynamic character discovery from conversations**
- **First game with AI-generated visual testimony scenes**
- **First detective game with real-time lead generation**

### **🎭 Revolutionary Gameplay**
- **No Scripted Dialogue**: Ask suspects anything using natural language
- **Organic Case Growth**: Investigations expand based on discovered leads
- **Visual Storytelling**: Testimony becomes visual evidence
- **AI-Powered Deduction**: Get assistance from logical AI analysis

## 🧪 **Testing**

### **Manual Testing**
```bash
# Test case generation
curl -X POST http://localhost:8001/api/generate-case

# Test character questioning
curl -X POST http://localhost:8001/api/question-character \
  -H "Content-Type: application/json" \
  -d '{"case_id":"case_id","character_id":"char_id","question":"What did you see?"}'
```

### **Automated Testing**
```bash
cd backend
python backend_test.py
```

## 🚀 **Deployment**

The application is designed for Kubernetes deployment with:
- **Frontend**: Nginx serving React build
- **Backend**: FastAPI with Gunicorn/Uvicorn
- **Database**: MongoDB with persistent volumes
- **Process Management**: Supervisor for service orchestration

## 🤝 **Contributing**

### **Generated Code Notice**
This project was primarily generated using advanced AI assistance (Claude-3.5-Sonnet) with human guidance and iteration. Key areas for contribution:

1. **Additional AI Integrations**: New AI services for enhanced features
2. **Visual Improvements**: Enhanced UI/UX design
3. **Game Mechanics**: New investigation tools and features
4. **Performance Optimization**: Database queries and API efficiency
5. **Testing**: Comprehensive test coverage

### **Development Guidelines**
- Follow existing code patterns and structure
- Test all AI integrations thoroughly
- Document new features in README
- Ensure responsive design for all screen sizes

## 📊 **Performance**

### **Response Times**
- **Case Generation**: 10-30 seconds (AI processing)
- **Character Questioning**: 2-5 seconds
- **Visual Scene Generation**: 30-60 seconds
- **Evidence Analysis**: 3-8 seconds

### **Cost Estimates** (per investigation)
- **Text Generation**: $0.10-0.50
- **Visual Generation**: $0.15-1.20
- **Total per case**: $0.25-1.70

## 🎯 **Future Enhancements**

- **🎬 Video Scene Generation**: Moving visual testimony
- **🎵 Audio Integration**: Voice acting for characters  
- **🌍 Multiplayer Mode**: Collaborative investigations
- **📱 Mobile App**: Native mobile experience
- **🔍 Advanced Analytics**: Investigation pattern analysis
- **🎨 Custom Visual Styles**: Different art styles for cases

## 📄 **License**

This project is proprietary. The innovative dual-AI architecture and visual testimony generation represent novel approaches to AI-powered gaming.

## 🙏 **Acknowledgments**

- **OpenAI** for GPT-4 creative capabilities
- **Anthropic** for Claude's logical reasoning
- **FAL.AI** for high-quality image generation
- **The Detective Fiction Genre** for inspiration

---

**🕵️‍♂️ Experience the future of detective gaming - where AI creates mysteries as engaging as the greatest detective novels!**
