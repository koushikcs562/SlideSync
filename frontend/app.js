document.getElementById('generateBtn').addEventListener('click', async () => {
    const textInput = document.getElementById('jiraInput').value.trim();
    const actionButton = document.getElementById('generateBtn');

    if (!textInput) {
        alert("Please paste some messy logs or updates first!");
        return;
    }

    // Freeze UI and show processing state
    actionButton.disabled = true;
    actionButton.innerText = "⏳ Processing massive data & building deck...";

    try {
        // 1. Transmit raw text package to local Node backend router
        const networkResponse = await fetch('http://localhost:5000/api/summarize', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: textInput,
                userId: 'user_test_01' // Simulating local session profile
            })
        });

        if (!networkResponse.ok) {
            const errorDetails = await networkResponse.json();
            throw new Error(errorDetails.error || "Server error occurred.");
        }

        const data = await networkResponse.json();

        // 2. Initialize PptxGenJS instance
        let pptx = new PptxGenJS();
        pptx.layout = 'LAYOUT_16x9';

        // 3. Slide 1: Generate an automated Title Slide
// 4. Dynamic Generation Loop: Create a dedicated content slide per AI category
        data.slides.forEach(slideEntry => {
            let contentSlide = pptx.addSlide();

            // Render crisp, standardized headers
            contentSlide.addText(slideEntry.slideTitle.toUpperCase(), {
                x: 0.8,
                y: 0.6,
                w: 11.5,
                fontSize: 28,
                bold: true,
                color: '0A192F',
                fontFace: 'Arial'
            });

            // Draw a subtle design line separator under the header
            contentSlide.addShape(pptx.ShapeType.line, { 
                x: 0.8, 
                y: 1.2, 
                w: 11.7, 
                h: 0, 
                line: { color: 'CCD6F6', width: 2 } 
            });

            // Reformat the bullets array into an array of object lines for PptxGenJS
            let formattedBulletObjects = slideEntry.bullets.map(bulletText => {
                return { text: bulletText, options: { bullet: true, color: '333333' } };
            });

            // Compile global box container coordinates
            let containerBoxOptions = {
                x: 0.8,
                y: 1.8,
                w: 11.7,
                h: 4.8,
                fontSize: 16,
                fontFace: 'Arial',
                lineSpacing: 28,
                valign: 'top'
            };

            // Inject the array objects cleanly into the slide container
            contentSlide.addText(formattedBulletObjects, containerBoxOptions);
        });            // Draw a subtle design line separator under the header
            contentSlide.addShape(pptx.ShapeType.line, { 
                x: 0.8, 
                y: 1.2, 
                w: 11.7, 
                h: 0, 
                line: { color: 'CCD6F6', width: 2 } 
            });

            // Compile formatting parameters for the executive bullets box
            let bulletConfigOptions = {
                x: 0.8,
                y: 1.8,
                w: 11.7,
                h: 4.8,
                fontSize: 16,
                color: '333333',
                fontFace: 'Arial',
                lineSpacing: 28,
                bullet: true,
                valign: 'top'
            };

            // Inject the array of bullet points directly into the slide area cleanly
            contentSlide.addText(slideEntry.bullets, bulletConfigOptions);
        });

        // 5. Trigger seamless browser file container download delivery
        pptx.writeFile({ fileName: `SlideSync_Executive_Report.pptx` });

    } catch (frontendError) {
        console.error("Execution Failure:", frontendError);
        alert(frontendError.message || "Internal server bottleneck handling AI processing.");
    } finally {
        // Restore active UI interaction capabilities
        actionButton.disabled = false;
        actionButton.innerText = "⚡ Convert to PowerPoint (.pptx)";
    }
});