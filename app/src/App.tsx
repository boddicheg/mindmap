import "./index.css";
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Projects from './pages/Projects';
import { useEffect } from "react";
// import Project from './pages/Project';

function App() {
  useEffect(() => {
    console.log("Hello World");
  }, []);

  return (
    <BrowserRouter>
      <div className="flex h-screen bg-gray-100">
        <Sidebar />

        <div className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Projects />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
