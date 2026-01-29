import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import Submit from './pages/Submit'
import Host from './pages/Host'
import Play from './pages/Play'
import TV from './pages/TV'
import Finish from './pages/Finish'
import Upload from './pages/Upload'
import Slideshow from './pages/Slideshow'
import Prompt from './pages/Prompt'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/submit" element={<Submit />} />
        <Route path="/host" element={<Host />} />
        <Route path="/play" element={<Play />} />
        <Route path="/tv" element={<TV />} />
        <Route path="/finish" element={<Finish />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/slideshow" element={<Slideshow />} />
        <Route path="/prompt" element={<Prompt />} />
        <Route path="/" element={<Submit />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
