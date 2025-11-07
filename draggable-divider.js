// ============================================
// DRAGGABLE DIVIDER FOR MOBILE SCREENS
// ============================================

(function() {
    let isInitialized = false;
    let resizeObserver = null;

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

    // Clean up existing listeners
    function cleanup() {
        const handle = document.querySelector('.resize-handle');
        if (handle) {
            const newHandle = handle.cloneNode(true);
            handle.parentNode.replaceChild(newHandle, handle);
        }
    }

    // Initialize draggable divider
    function initDraggableDivider() {
        // Prevent multiple initializations
        if (isInitialized) return;
        
        if (!isMobile()) {
            const handle = document.querySelector('.resize-handle');
            if (handle) handle.style.display = 'none';
            return;
        }

        const handle = createResizeHandle();
        const mapElement = document.getElementById('map');
        const sidebar = document.querySelector('.sidebar');
        
        if (!handle || !mapElement || !sidebar) return;

        // Mark as initialized
        isInitialized = true;

        let isDragging = false;
        let startY = 0;
        let startMapHeight = 0;
        let startSidebarHeight = 0;
        let rafId = null;

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

        // Handle dragging with requestAnimationFrame for better performance
        function onDrag(e) {
            if (!isDragging) return;

            // Cancel previous frame
            if (rafId) {
                cancelAnimationFrame(rafId);
            }

            rafId = requestAnimationFrame(() => {
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
                    
                    // Trigger map resize for proper rendering (throttled)
                    if (typeof map !== 'undefined' && map.resize) {
                        map.resize();
                    }
                }
            });

            e.preventDefault();
        }

        // Handle drag end
        function onDragEnd() {
            if (!isDragging) return;
            
            isDragging = false;
            handle.style.background = '';
            document.body.style.cursor = '';
            
            if (rafId) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
        }

        // Mouse events
        handle.addEventListener('mousedown', onDragStart, { passive: false });
        document.addEventListener('mousemove', onDrag, { passive: false });
        document.addEventListener('mouseup', onDragEnd);

        // Touch events
        handle.addEventListener('touchstart', onDragStart, { passive: false });
        document.addEventListener('touchmove', onDrag, { passive: false });
        document.addEventListener('touchend', onDragEnd);
        document.addEventListener('touchcancel', onDragEnd);
    }

    // Handle window resize without reloading
    let resizeTimeout;
    function handleResize() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            const wasMobile = isInitialized;
            const nowMobile = isMobile();
            
            if (wasMobile && !nowMobile) {
                // Switched from mobile to desktop
                const mapElement = document.getElementById('map');
                const sidebar = document.querySelector('.sidebar');
                const handle = document.querySelector('.resize-handle');
                
                if (mapElement) mapElement.style.height = '';
                if (sidebar) sidebar.style.height = '';
                if (handle) handle.style.display = 'none';
                
                isInitialized = false;
            } else if (!wasMobile && nowMobile) {
                // Switched from desktop to mobile
                isInitialized = false;
                initDraggableDivider();
            }
        }, 300);
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDraggableDivider);
    } else {
        initDraggableDivider();
    }

    // Single resize listener
    window.addEventListener('resize', handleResize);
})();