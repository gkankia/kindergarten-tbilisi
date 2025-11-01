// QUESIONNAIRE FUNCTIONS

document.querySelectorAll('.dropdown-toggle').forEach(btn => {
            btn.addEventListener('click', () => {
                const content = btn.nextElementSibling;
                const isVisible = content.style.display === 'block';
                content.style.display = isVisible ? 'none' : 'block';
                btn.textContent = btn.textContent.replace(isVisible ? '▲' : '▼', isVisible ? '▼' : '▲');
            });
        });

        function setupCheckboxGroup(groupName, otherCheckboxId, otherTextId, maxSelection = 3) {
            const checkboxes = document.querySelectorAll(`input[name="${groupName}"]`);
            const otherCheckbox = document.getElementById(otherCheckboxId);
            const otherText = document.getElementById(otherTextId);
        
            checkboxes.forEach(cb => {
                cb.addEventListener('change', () => {
                    // Count checked checkboxes including "Other"
                    const checkedCount = Array.from(checkboxes).filter(c => c.checked).length;
        
                    // Enforce max selection
                    if (checkedCount > maxSelection) {
                        cb.checked = false;
                        alert(`მაქსიმუმ ${maxSelection} არჩევანი შეგიძლიათ მონიშნოთ.`);
                    }
        
                    // Show/hide text input for "Other"
                    if (cb === otherCheckbox) {
                        otherText.style.display = cb.checked ? 'inline-block' : 'none';
                    }
                });
            });
        }
        
        // Initialize both groups
        setupCheckboxGroup('reason', 'reasonOtherCheckbox', 'reasonOtherText', 3);
        setupCheckboxGroup('priority', 'priorityOtherCheckbox', 'priorityOtherText', 3);