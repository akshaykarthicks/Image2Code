import {
    ChevronDown,
    Layers,
    Pen,
    Upload,
  } from 'lucide-react';
  import Head from 'next/head';
  import { useCallback, useEffect, useState } from 'react';
  import { Accept, useDropzone } from 'react-dropzone';
  import CodePreview from '../components/CodePreview';
  import ErrorModal from '../components/ErrorModal';
  import Header from '../components/Header';

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

  export default function Home() {
    const [imageBase64, setImageBase64] = useState('');
    const [outputs, setOutputs] = useState<{ id: number; code: string; fullResponse: string }[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasStartedGenerating, setHasStartedGenerating] = useState(false);
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
          `You are an expert web developer who specializes in turning images into clean, responsive, and beautiful HTML and CSS code. A user will upload an image, and you will generate a single, self-contained HTML file with embedded CSS that visually replicates the image.

  ## CORE PRINCIPLE
  The goal is not to create a pixel-perfect copy, but to capture the visual essence, layout, and color palette of the image using modern web technologies. The output should be a functional and aesthetically pleasing webpage component.

  ## EXAMPLES
  Here are examples of the expected creative transformation:
  - A photo of a product card on a website --> HTML and CSS for a responsive product card component.
  - A photo of a simple landscape --> A hero section with a CSS gradient background that captures the sky and land colors, with styled text.
  - A photo of a mobile app's UI --> The corresponding HTML structure and CSS styles to build that UI component for the web.
  - A photo of a business card --> A digital business card laid out with HTML and CSS.

  ## PROCESS
  Before writing any code, you must follow this structured thinking process and present it in your response:
  1.  **Analyze Visual Elements:** Break down the image into its core visual components. Identify the layout structure (e.g., header, main content, footer, columns), key shapes, text elements, and the dominant color palette.
  2.  **Define HTML Structure:** Plan a semantic HTML structure for the components identified. Use tags like \`<section>\`, \`<div>\`, \`<h1>\`, \`<p>\`, and \`<button>\` appropriately to represent the image's structure.
  3.  **Implement CSS Styling:** Write the CSS to style the HTML. Use modern techniques like Flexbox or CSS Grid for layout. Extract the color palette into CSS variables for easy reuse. Style the text and other elements to match the image's vibe. The CSS should be embedded within a \`<style>\` tag in the \`<head>\` of the HTML.

  ## OUTPUT FORMAT
  After completing the process above, you must generate a SINGLE, COMPLETE HTML code snippet in an HTML code block. The snippet must be a full HTML document, starting with \`<!DOCTYPE html>\` and including the \`<head>\` with a \`<style>\` tag and a \`<body>\`. The application will parse this code block, so only one HTML code block should be present in your response. Your descriptive text from the PROCESS section should come before the code block.

  ## CONSTRAINTS
  - **Self-Contained:** The generated code MUST be a single HTML file with embedded CSS in a \`<style>\` tag.
  - **No External Assets:** Do NOT use external images, fonts, or stylesheets. All visuals must be generated with pure HTML and CSS (e.g., use CSS gradients for backgrounds, divs for shapes).
  - **Responsive:** The layout should be reasonably responsive to different screen sizes.
  - **No JavaScript:** The output must be pure HTML and CSS only. Do not include any \`<script>\` tags or JavaScript code.
  - **Visual Fidelity:** The final output's layout and color scheme must visually resemble the composition of the user's uploaded image.`.trim();
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
    const [selectedSample, setSelectedSample] = useState<string | null>(null);
    const [userInput, setUserInput] = useState('');

    const onDrop = useCallback((acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      const reader = new FileReader();

      reader.onload = (event) => {
        if (typeof event.target?.result === 'string') {
          const img = document.createElement('img');
          img.src = event.target.result;

          img.onload = () => {
            const canvas = document.createElement('canvas');
            const scaleFactor = 512 / img.width;
            canvas.width = 512;
            canvas.height = img.height * scaleFactor;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              setImageBase64(canvas.toDataURL());
            }
          };
        }
      };

      reader.readAsDataURL(file);
    }, []);

    const { getRootProps, getInputProps } = useDropzone({
      onDrop,
      accept: { 'image/*': [] } as Accept,
    });

    const generateCode = async () => {
      if (!imageBase64) return;

      setLoading(true);
      setHasStartedGenerating(true);
      setOutputs([]);

      try {
        const requests = Array(concurrentRequests)
          .fill(0)
          .map(() =>
            fetch('/api/generate', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                imageBase64,
                prompt,
                userInput,
              }),
            }).then((res) => res.json())
          );

        const results = await Promise.all(requests);

        setOutputs(
          results.map((result, index) => ({
            id: index + 1,
            code: result.code,
            fullResponse: result.fullResponse,
          }))
        );
      } catch (error) {
        console.error('Error generating code:', error);
        setShowErrorModal(true);
      } finally {
        setLoading(false);
      }
    };

    const handleCodeChange = (id: number, newCode: string) => {
      setOutputs((prevOutputs) =>
        prevOutputs.map((output) =>
          output.id === id ? { ...output, code: newCode } : output
        )
      );
    };

    const handleSampleSelect = async (imageName: string) => {
      setSelectedSample(imageName);
      try {
        const response = await fetch(
          `https://www.gstatic.com/aistudio/starter-apps/code/samples/${imageName}`
        );
        const blob = await response.blob();
        const reader = new FileReader();

        reader.onload = (event) => {
          if (typeof event.target?.result === 'string') {
            const img = document.createElement('img');
            img.src = event.target.result;

            img.onload = () => {
              const canvas = document.createElement('canvas');
              const scaleFactor = 512 / img.width;
              canvas.width = 512;
              canvas.height = img.height * scaleFactor;
              const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              setImageBase64(canvas.toDataURL());
            }
            };
          }
        };

        reader.readAsDataURL(blob);
      } catch (error) {
        console.error('Error loading sample image:', error);
      }
    };

    const uploaderSection = (
      <>
        <section className="flex flex-col bg-gray-100 rounded-2xl p-4">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed bg-white rounded-2xl m-4 min-h-96 h-fit flex
          flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors ${
            imageBase64 ? 'border-none p-0' : 'border-gray-300'
          }`}
          >
            <input {...getInputProps()} />
            {imageBase64 ? (
              <img
                src={imageBase64}
                alt="Uploaded"
                className="max-h-full max-w-full object-contain rounded-2xl"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-8">
                <Upload className="w-12 h-12 text-gray-400 mb-4" />
                <h3 className="font-semibold text-gray-700">
                  Drop your image here
                </h3>
                <p className="text-sm text-gray-500">
                  or{' '}
                  <span className="text-blue-600 font-semibold">
                    browse files
                  </span>
                </p>
              </div>
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
                  }`}
                >
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
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
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
                        className="text-sm font-medium text-gray-700"
                      >
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
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    <Pen size={14} />
                    <span>Edit System Prompt</span>
                    <ChevronDown
                      size={16}
                      className={`transform transition-transform ${
                        showPrompt ? 'rotate-180' : ''
                      }`}
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
            disabled={!imageBase64 || loading}
          >
            <span>
              {loading
                ? 'Generating...'
                : `Generate ${concurrentRequests} Code Snippet${
                    concurrentRequests > 1 ? 's' : ''
                  }`}
            </span>
          </button>
        </section>
      </>
    );

    return (
      <>
        <Head>
          <title>Image to Code</title>
        </Head>
        <div className="fixed inset-0 bg-white mt-[0px] sm:mt-0">
          <Header />
          <ErrorModal
            isOpen={showErrorModal}
            onClose={() => setShowErrorModal(false)}
          />
          <div className="absolute inset-0 top-[57px] sm:top-[73px] overflow-y-auto overscroll-y-contain -webkit-overflow-scrolling-touch">
            {!hasStartedGenerating ? (
              <div className="max-w-7xl mx-auto p-4 sm:p-8">
                <div className="grid md:grid-cols-2 gap-12 items-center min-h-[calc(100vh-73px-4rem)]">
                  {/* Left Column */}
                  <div className="flex flex-col">
                    <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                      Turn any image into code
                    </h1>
                    <p className="mt-6 text-lg leading-8 text-gray-600">
                      From design mockups to screenshots, upload an image and let
                      AI magically transform it into clean, responsive HTML and
                      CSS.
                    </p>
                    <div className="mt-10">{uploaderSection}</div>
                  </div>

                  {/* Right Column */}
                  <div className="hidden md:block p-8 bg-gray-50 rounded-3xl">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4 text-center">
                      Or try one of our samples
                    </h2>
                    <div className="grid grid-cols-2 gap-4">
                      {SAMPLE_IMAGES.map((image) => (
                        <button
                          key={image}
                          type="button"
                          onClick={() => handleSampleSelect(image)}
                          className={`rounded-xl overflow-hidden transition-all duration-200 aspect-square ${
                            selectedSample === image
                              ? 'ring-4 ring-blue-500 ring-offset-2'
                              : 'hover:scale-105'
                          }`}
                        >
                          <img
                            src={`https://www.gstatic.com/aistudio/starter-apps/code/samples/${image}`}
                            alt={image}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row gap-4 max-w-7xl mx-auto md:h-[calc(100vh-73px)]">
                <div className="w-full md:w-6/12 py-4 md:py-12 px-3 md:overflow-y-auto">
                  {uploaderSection}
                </div>
                <div className="w-full md:w-6/12 py-4 md:py-12 px-3 animate-slide-in md:overflow-y-auto md:h-full">
                  {loading
                    ? Array(concurrentRequests)
                        .fill(0)
                        .map((_, index) => (
                          <div
                            key={`skeleton-preview-${Date.now()}-${index}`}
                            className="mb-4 p-6 rounded-3xl bg-gray-100 animate-pulse"
                          >
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
              </div>
            )}
          </div>
        </div>
      </>
    );
  }
