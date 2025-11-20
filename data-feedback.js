// Data Source Popup
function openDataSourcePopup() {
    const overlay = document.createElement('div');
    overlay.className = 'info-popup-overlay';
    overlay.onclick = closeInfoPopup;
    
    const popup = document.createElement('div');
    popup.className = 'info-popup';
    
    popup.innerHTML = `
        <div class="info-popup-header">
            <div class="info-popup-title">
                <h2>მონაცემები</h2>
            </div>
            <button class="info-popup-close" onclick="closeInfoPopup()">×</button>
        </div>
        <div class="info-popup-content">
            <p style="margin-bottom: 20px; font-size: 14px">
                ამ პლატფორმაზე წარმოდგენილი ანალიზი ეყრდნობა შემდეგ მონაცემებს:
            </p>
            
            <ul class="data-source-list">
                <li class="data-source-item">
                    <h4>საჯარო სკოლების მონაცემები</h4>
                    <p>წყარო: GeoWell Research 2022</p>
                </li>
                
                <li class="data-source-item">
                    <h4>ბაგა-ბაღების მონაცემები</h4>
                    <p>წყარო: თბილისის მერია / OpenStreetMap 2025</p>
                </li>
                
                <li class="data-source-item">
                    <h4>საგზაო შემთხვევების სტატისტიკა</h4>
                    <p>წყარო: შინაგან საქმეთა სამინისტრო (2021-2022)</p>
                </li>
                
                <li class="data-source-item">
                    <h4>მარშრუტების გენერაცია და გეოგრაფიული მონაცემები</h4>
                    <p>წყარო: Turf.js / OpenStreetMap / Mapbox</p>
                </li>
                <li class="data-source-item">
                    <h4>ქუჩის ფოტოები</h4>
                    <p>წყარო: Mapillary</p>
                </li>
            </ul>
            
            <p style="margin-top: 20px; font-size: 12px; color: #6b7280; font-style: italic;">
                ანალიზის ციტირების, კოდის რეპროდუქციის ან მონაცემების გამოყენების შემთხვევაში, გთხოვთ მიუთითოთ წყარო შემდეგი ფორმატით: Urbanyx by Z.axis, 2025. 
                დაუშვებელია აქ წარმოდგენილი ინტელექტუალური მასალის კომერციული მიზნით გამოყენება.
            </p>
        </div>
    `;
    
    document.body.appendChild(overlay);
    document.body.appendChild(popup);
}

// Initialize EmailJS 
(function() {
    emailjs.init("a4S8CQtZNMLh57ruh"); // from EmailJS dashboard
})();

// Feedback Popup
function openFeedbackPopup() {
    const overlay = document.createElement('div');
    overlay.className = 'info-popup-overlay';
    overlay.onclick = closeInfoPopup;
    
    const popup = document.createElement('div');
    popup.className = 'info-popup';
    
    popup.innerHTML = `
        <div class="info-popup-header">
            <div class="info-popup-title">
                <h2>უკუკავშირი</h2>
            </div>
            <button class="info-popup-close" onclick="closeInfoPopup()">×</button>
        </div>
        <div class="info-popup-content">
            <p style="margin-bottom: 20px; font-size: 14px">
                თქვენი აზრი მნიშვნელოვანია!
            </p>
            
            <form id="feedbackForm" style="display: flex; flex-direction: column; gap: 15px;">
                <div>
                    <label style="display: block; font-size: 13px; margin-bottom: 5px; font-weight: 500; color: #374151;">სახელი</label>
                    <input type="text" id="feedbackName" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px;">
                </div>
                
                <div>
                    <label style="display: block; font-size: 13px; margin-bottom: 5px; font-weight: 500; color: #374151;">ელ-ფოსტა</label>
                    <input type="email" id="feedbackEmail" required style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px;">
                </div>
                
                <div>
                    <label style="display: block; font-size: 13px; margin-bottom: 5px; font-weight: 500; color: #374151;">შეტყობინება</label>
                    <textarea id="feedbackMessage" rows="5" required style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px; resize: vertical;"></textarea>
                </div>
                
                <button class="send" type="submit" style="padding: 12px 24px; background: #f4f4f4; color: #810f7c;; border: none; border-radius: 5px; font-weight: bold; cursor: pointer; transition: all 0.2s;">
                    გაგზავნა
                </button>
            </form>
            <p style="margin-top: 20px; font-size: 12px; color: #6b7280;">
                ან დაგვიკავშირდით: <a href="mailto:info@zaxis.ge" style="color: #810f7c; text-decoration: none;">info@zaxis.ge</a>
            </p>
        </div>
    `;
    
    document.body.appendChild(overlay);
    document.body.appendChild(popup);

    // Update form submission
    document.getElementById('feedbackForm').onsubmit = function(e) {
        e.preventDefault();
        
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'იგზავნება...';
        submitBtn.disabled = true;
        
        const templateParams = {
            from_name: document.getElementById('feedbackName').value || 'Anonymous',
            from_email: document.getElementById('feedbackEmail').value || 'No email provided',
            message: document.getElementById('feedbackMessage').value
        };
        
        emailjs.send('service_1qru585', 'template_1te96a7', templateParams)
            .then(function(response) {
                alert('გმადლობთ უკუკავშირისთვის!');
                closeInfoPopup();
            }, function(error) {
                alert('შეცდომა! გთხოვთ სცადოთ ხელახლა.');
                console.error('EmailJS error:', error);
            })
            .finally(function() {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            });
    };
}
// Close popup
function closeInfoPopup() {
    const overlay = document.querySelector('.info-popup-overlay');
    const popup = document.querySelector('.info-popup');
    if (overlay) overlay.remove();
    if (popup) popup.remove();
}