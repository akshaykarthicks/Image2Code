/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */
/**
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {GoogleGenAI} from '@google/genai';
import {
  ArrowRight,
  ChevronDown,
  History,
  Image,
  Layers,
  Pen,
  Send,
  Settings,
  Upload,
} from 'lucide-react';
import React, {useCallback, useEffect, useState} from 'react';
import {useDropzone} from 'react-dropzone';
import CodePreview from './components/CodePreview';
import ErrorModal from './components/ErrorModal';
import Header from './components/Header';

const SAMPLE_IMAGES = [
  'beeripple.jpeg',
  'bubbles.jpeg',
  'clock.png',
  'flower.jpeg',
  'garage.jpeg',
  'sconce.jpeg',
  'steam.jpeg',
  'tree.png',
  'birds.jpeg',
  'bubblemachine.png',
];

const MODEL_NAME = 'gemini-2.5-flash';
// fix: Use API_KEY environment variable for Gemini API key as per guidelines.
const ai = new GoogleGenAI({apiKey: process.env.API_KEY});

// Helper function to generate code from image
async function generateCodeFromImage(imageBase64, prompt, userInput) {
  const image = {
    inlineData: {
      data: imageBase64.split(',')[1],
      mimeType: 'image/jpeg',
    },
  };

  const finalPrompt = userInput.trim()
    ? `${prompt}\n\nUser input: ${userInput}`
    : prompt;

  const result = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: [finalPrompt, image],
  });
  const response = result.text;

  const regex = /```(?:javascript|js)?\s*([\s\S]*?)```/g;
  const match = regex.exec(response);
  const extractedCode = match ? match[1].trim() : response;

  return {
    fullResponse: response,
    code: extractedCode,
  };
}

export default function Home() {
  const [imageBase64, setImageBase64] = useState('');
  const [outputs, setOutputs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasStartedGenerating, setHasStartedGenerating] = useState(false);
  const [selectedOutput, setSelectedOutput] = useState(null);
  const [concurrentRequests, setConcurrentRequests] = useState(5);
  const [showPrompt, setShowPrompt] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);

  // Load prompt from localStorage on initial render
  useEffect(() => {
    const savedPrompt = localStorage.getItem('savedPrompt');
    if (savedPrompt) {
      setPrompt(savedPrompt);
    } else {
      const defaultPrompt =
        `You are a creative coding expert who turns images into clever code sketches using p5.js. A user will upload an image and you will generate an interactive p5.js sketch that represents the image. The code sketch must be thoughtful, clever, delightful, and playful.

## CORE PRINCIPLE
The sketch must not be a literal copy of the image. Instead, it must capture the essence and behavior of the object in the image. The interactivity should be directly related to how the object functions or behaves in the real world.

## EXAMPLES
Here are examples of the expected creative transformation:
- A photo of birds --> A boids flocking algorithm sketch where the boids follow the user's mouse.
- A photo of a tree --> A recursive fractal tree that grows and shrinks as the user moves the mouse up and down.
- A photo of a pond --> A sketch with a water surface that creates a ripple animation on mouse click.
- A photo of a wristwatch --> A beautiful, functioning clock that accesses system time and displays it in the style of the watch.
- A photo of a zipper --> A sketch of zipper teeth that open and close as the user moves the mouse vertically.

## PROCESS
Before writing any code, you must follow this structured thinking process and present it in your response:
1.  **Analyze Behavioral Properties:** Meditate on the nature of the object in the image. Describe its real-world behaviors, functions, and patterns. Also, describe the colors, textures, and overall vibe of the image.
2.  **Select a Creative Coding Algorithm:** Based on the behavioral properties, identify a suitable creative coding algorithm or technique (e.g., procedural generation, particle systems, physics simulation, recursion) that can be used to create a delightful interactive experience.
3.  **Define Compositional Bounding Boxes:** Analyze the composition of the source image. Define the bounding boxes or key coordinates for the important elements. This is crucial to ensure your p5.js sketch has a similar composition to the original photo.
4.  **Implement the Sketch:** Write the p5.js code based on the plan above.

## OUTPUT FORMAT
After completing the process above, you must generate a SINGLE, COMPLETE p5.js code snippet in a JavaScript code block. The application will parse this code block, so only one code block containing p5.js code should be present in your response. Your descriptive text from the PROCESS section should come before the code block.

## CONSTRAINTS
- **Interactivity is Mandatory:** The sketch MUST use mouseMoved(), mouseClicked(), or other mouse/keyboard inputs to create an interactive element.
- **Single File, No External Assets:** The sketch code must be entirely self-contained. Do NOT load any external images, fonts, or data files. All visuals must be generated procedurally with p5.js drawing functions.
- **Clear Comments:** The sketch code must be well-commented to explain the different parts of the algorithm and your creative decisions.
- **Compositional Integrity:** The final sketch's layout must visually resemble the composition of the user's uploaded image, using the bounding boxes you defined.`.trim();
      setPrompt(defaultPrompt);
      localStorage.setItem('savedPrompt', defaultPrompt);
    }
  }, []);

  // Save prompt to localStorage whenever it changes
  useEffect(() => {
    if (prompt) {
      localStorage.setItem('savedPrompt', prompt);
    }
  }, [prompt]);

  const [showSamples, setShowSamples] = useState(false);
  const [selectedSample, setSelectedSample] = useState(null);
  const [userInput, setUserInput] = useState('');
  const [imageDetails, setImageDetails] = useState(null);

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    const reader = new FileReader();

    reader.onload = (event) => {
      // fix(Home.tsx:154): Type 'string | ArrayBuffer' is not assignable to type 'string'.
      if (typeof event.target?.result === 'string') {
        const img = document.createElement('img');
        img.src = event.target.result;

        img.onload = () => {
          const canvas = document.createElement('canvas');
          const scaleFactor = 512 / img.width;
          canvas.width = 512;
          canvas.height = img.height * scaleFactor;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          setImageBase64(canvas.toDataURL());
          setImageDetails({
            name: file.name,
            size: `${(file.size / 1024).toFixed(2)}kB`,
            type: file.type,
          });
        };
      }
    };

    reader.readAsDataURL(file);
  }, []);

  const {getRootProps, getInputProps, isDragActive} = useDropzone({
    onDrop,
    // fix(Home.tsx:177): Type 'string' is not assignable to type 'Accept'.
    accept: {'image/*': []},
  });

  const generateCode = async () => {
    if (!imageBase64) return;

    setLoading(true);
    setHasStartedGenerating(true);
    setOutputs([]);

    try {
      // fix(Home.tsx:189): Expected 1-3 arguments, but got 0.
      const requests = Array(concurrentRequests)
        .fill(0)
        .map(() => generateCodeFromImage(imageBase64, prompt, userInput));

      const results = await Promise.all(requests);

      // fix(Home.tsx:195): Property 'error' does not exist on type '{ fullResponse: string; code: string; }'. This check is removed as Promise.all rejection is handled by the surrounding catch block.
      setOutputs(
        results.map((result, index) => ({
          id: index + 1,
          code: result.code,
          fullResponse: result.fullResponse,
        })),
      );
    } catch (error) {
      console.error('Error generating code:', error);
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const renderSketch = (code) => {
    const formattedCodeResponse = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=512, initial-scale=1.0">
        <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.4.0/p5.js"></script>
        <title>p5.js Sketch</title>
        <style> body {padding: 0; margin: 0;} </style>
      </head>
      <body>
      <script>
        window.onerror = function(message, source, lineno, colno, error) {
          document.body.innerHTML += '<h3>🔴Error:</h3><pre>' + message + '</pre>';
        };
        ${code}
      </script>
      </body>
      </html>
    `;

    return (
      <iframe
        srcDoc={formattedCodeResponse}
        title="p5.js Sketch"
        width="100%"
        height="300"
        style={{border: 'none'}}
      />
    );
  };

  const handleCodeChange = (id, newCode) => {
    setOutputs((prevOutputs) =>
      prevOutputs.map((output) =>
        output.id === id ? {...output, code: newCode} : output,
      ),
    );
  };

  const handleSampleSelect = async (imageName) => {
    setSelectedSample(imageName);
    try {
      const response = await fetch(
        `https://www.gstatic.com/aistudio/starter-apps/code/samples/${imageName}`,
      );
      const blob = await response.blob();
      const reader = new FileReader();

      reader.onload = (event) => {
        // fix(Home.tsx:267): Type 'string | ArrayBuffer' is not assignable to type 'string'.
        if (typeof event.target?.result === 'string') {
          const img = document.createElement('img');
          img.src = event.target.result;

          img.onload = () => {
            const canvas = document.createElement('canvas');
            const scaleFactor = 512 / img.width;
            canvas.width = 512;
            canvas.height = img.height * scaleFactor;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            setImageBase64(canvas.toDataURL());
          };
        }
      };

      reader.readAsDataURL(blob);
    } catch (error) {
      console.error('Error loading sample image:', error);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-white mt-[0px] sm:mt-0">
        <Header />
        <ErrorModal
          isOpen={showErrorModal}
          onClose={() => setShowErrorModal(false)}
        />
        <div className="absolute inset-0 top-[57px] sm:top-[73px] overflow-y-auto overscroll-y-contain -webkit-overflow-scrolling-touch">
          <div
            className={`flex flex-col md:flex-row gap-4 max-w-7xl mx-auto ${!hasStartedGenerating ? 'justify-center' : ''} md:h-[calc(100vh-73px)]`}>
            <div
              className={`w-full md:w-6/12 py-4 md:py-12 px-3 ${!hasStartedGenerating ? 'md:max-w-2xl mx-auto' : ''} md:overflow-y-auto`}>
              <section className="flex flex-col bg-gray-100 rounded-2xl p-4">
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed bg-gray-100 rounded-2xl m-4 min-h-96 h-fit flex
                flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors ${imageBase64 ? 'border-none' : 'border-gray-300'}`}>
                  <input {...getInputProps()} />
                  {imageBase64 ? (
                    <img
                      src={imageBase64}
                      alt="Uploaded"
                      className="max-h-full max-w-full object-contain rounded-2xl"
                    />
                  ) : (
                    <>
                      <Upload className="w-12 h-12 text-gray-400 mb-4" />
                      <p className="text-gray-400 text-center px-4">
                        {isDragActive
                          ? 'Drop the image here'
                          : 'Drag & drop an image here, or click to select one'}
                      </p>
                    </>
                  )}
                </div>
                <div className="max-w-full mb-4">
                  <div className="flex overflow-x-auto gap-2 py-1 mx-4">
                    {SAMPLE_IMAGES.map((image) => (
                      <button
                        key={image}
                        type="button"
                        onClick={() => handleSampleSelect(image)}
                        className={`flex-shrink-0 w-14 h-14 bg-white rounded-lg hover:scale-110 transition-all ${
                          selectedSample === image
                            ? 'border-blue-500 ring-2 ring-blue-200'
                            : 'border-gray-300'
                        }`}>
                        <img
                          src={`https://www.gstatic.com/aistudio/starter-apps/code/samples/${image}`}
                          alt={image}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </section>
              <section className="mt-4 space-y-4 bg-gray-100 rounded-2xl p-4">
                <div>
                  <button
                    type="button"
                    onClick={() => setShowSamples(!showSamples)}
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition-colors">
                    {/* <Settings size={16} /> */}
                    <span className="font-bold">Advanced</span>
                    <ChevronDown
                      size={16}
                      className={`transform transition-transform ${
                        showSamples ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {showSamples && (
                    <div className="my-2 rounded-lg">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Layers size={14} className="text-gray-600" />
                            <label
                              htmlFor="concurrent-requests"
                              className="text-sm font-medium text-gray-700">
                              Concurrent Requests: {concurrentRequests}
                            </label>
                          </div>
                          <input
                            id="concurrent-requests"
                            type="range"
                            min="1"
                            max="10"
                            value={concurrentRequests}
                            onChange={(e) =>
                              setConcurrentRequests(Number(e.target.value))
                            }
                            className="w-1/2"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowPrompt(!showPrompt)}
                          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition-colors">
                          <Pen size={14} />
                          <span>Edit System Prompt</span>
                          <ChevronDown
                            size={16}
                            className={`transform transition-transform ${showPrompt ? 'rotate-180' : ''}`}
                          />
                        </button>
                        {showPrompt && (
                          <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            className="w-full h-64 p-2 border rounded-lg font-mono text-sm mt-2 bg-white text-gray-900"
                            placeholder="Enter your prompt here..."
                          />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </section>
              <section className="mt-4">
                <button
                  type="button"
                  onClick={generateCode}
                  className="px-4 py-4 bg-gray-800 text-white rounded-2xl mb-8
                  hover:bg-gray-900  transition-colors w-full disabled:bg-gray-300 disabled:cursor-not-allowed
                  flex items-center justify-center gap-2 font-bold"
                  disabled={!imageBase64 || loading}>
                  {/* <Send size={16} className={loading ? 'opacity-50' : ''} /> */}
                  <span>
                    {loading
                      ? 'Generating...'
                      : `Generate ${concurrentRequests} Code Snippet${concurrentRequests > 1 ? 's' : ''}`}
                  </span>
                </button>
              </section>
            </div>
            {hasStartedGenerating && (
              <div className="w-full md:w-6/12 py-4 md:py-12 px-3 animate-slide-in md:overflow-y-auto md:h-full">
                {loading
                  ? // Loading skeletons for code previews
                    // fix(Home.tsx:429): Expected 1-3 arguments, but got 0.
                    Array(concurrentRequests)
                      .fill(0)
                      .map((_, index) => (
                        <div
                          key={`skeleton-preview-${Date.now()}-${index}`}
                          className="mb-4 p-6 rounded-3xl bg-gray-100 animate-pulse">
                          <div className="w-full h-[500px] bg-gray-200 rounded-lg mb-4" />
                          <div className="flex justify-between items-center">
                            <div className="h-10 w-32 bg-gray-200 rounded-full" />
                            <div className="h-10 w-24 bg-gray-200 rounded-full" />
                          </div>
                        </div>
                      ))
                  : outputs.map((output) => (
                      <CodePreview
                        key={output.id}
                        output={output}
                        onCodeChange={handleCodeChange}
                        fullResponse={output.fullResponse}
                      />
                    ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
