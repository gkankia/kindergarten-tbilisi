// ============================================
// DRAGGABLE DIVIDER FOR MOBILE SCREENS
// ============================================

(function() {
    // Check if we're on mobile
    function isMobile() {
        return window.innerWidth <= 768;
    }

    // Create the resize handle element
    function createResizeHandle() {
        const existingHandle = document.querySelector('.resize-handle');
        if (existingHandle) return existingHandle;

        const handle = document.createElement('div');
        handle.className = 'resize-handle';
        
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.insertBefore(handle, sidebar.firstChild);
        }
        
        return handle;
    }

    // Initialize draggable divider
    function initDraggableDivider() {
        if (!isMobile()) return;

        const handle = createResizeHandle();
        const mapElement = document.getElementById('map');
        const sidebar = document.querySelector('.sidebar');
        
        if (!handle || !mapElement || !sidebar) return;

        let isDragging = false;
        let startY = 0;
        let startMapHeight = 0;
        let startSidebarHeight = 0;

        // Handle drag start
        function onDragStart(e) {
            isDragging = true;
            
            // Get initial Y position (works for both mouse and touch)
            startY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
            
            // Get initial heights
            startMapHeight = mapElement.offsetHeight;
            startSidebarHeight = sidebar.offsetHeight;
            
            // Add visual feedback
            handle.style.background = '#810f7c';
            document.body.style.cursor = 'ns-resize';
            
            // Prevent text selection
            e.preventDefault();
        }

        // Handle dragging
        function onDrag(e) {
            if (!isDragging) return;

            // Get current Y position
            const currentY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
            const deltaY = currentY - startY;

            // Calculate new heights
            const newMapHeight = startMapHeight + deltaY;
            const newSidebarHeight = startSidebarHeight - deltaY;

            // Set minimum heights (20vh for each)
            const minHeight = window.innerHeight * 0.2;
            
            if (newMapHeight >= minHeight && newSidebarHeight >= minHeight) {
                const mapHeightVh = (newMapHeight / window.innerHeight) * 100;
                const sidebarHeightVh = (newSidebarHeight / window.innerHeight) * 100;
                
                mapElement.style.height = `${mapHeightVh}vh`;
                sidebar.style.height = `${sidebarHeightVh}vh`;
                
                // Trigger map resize for proper rendering
                if (typeof map !== 'undefined' && map.resize) {
                    map.resize();
                }
            }

            e.preventDefault();
        }

        // Handle drag end
        function onDragEnd() {
            if (!isDragging) return;
            
            isDragging = false;
            handle.style.background = '';
            document.body.style.cursor = '';
        }

        // Mouse events
        handle.addEventListener('mousedown', onDragStart);
        document.addEventListener('mousemove', onDrag);
        document.addEventListener('mouseup', onDragEnd);

        // Touch events
        handle.addEventListener('touchstart', onDragStart, { passive: false });
        document.addEventListener('touchmove', onDrag, { passive: false });
        document.addEventListener('touchend', onDragEnd);
        document.addEventListener('touchcancel', onDragEnd);

        // Clean up on window resize
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                if (!isMobile()) {
                    // Reset to default on desktop
                    mapElement.style.height = '';
                    sidebar.style.height = '';
                    if (handle) handle.style.display = 'none';
                } else {
                    // Ensure handle is visible on mobile
                    if (handle) handle.style.display = 'block';
                }
            }, 250);
        });
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDraggableDivider);
    } else {
        initDraggableDivider();
    }

    // Re-initialize on window resize (in case orientation changes)
    window.addEventListener('resize', () => {
        setTimeout(initDraggableDivider, 300);
    });
})();