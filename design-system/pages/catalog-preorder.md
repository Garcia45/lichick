# Page Override: Pre-Order Landing & Catalog (`preorder/index.blade.php`)

## Pattern Synthesis (`landing.csv` #1, #2, #12, #28)
1. **Top Scarcity Ticker + Live Batch Countdown**:
   - Displays active batch status and real-time countdown timer (`HH:MM:SS`) until the current cooking batch closes.
2. **Asymmetric Bento Hero (`styles.csv` #39)**:
   - Left 7 columns: High-impact value proposition, live social proof avatars ("420+ Mahasiswa Langganan"), and primary CTA.
   - Right 5 columns: Visual Hero Food Showcase Card with floating "Rp18.000 Flat" badge, "100% Real Crispy Chicken" seal, and live portion counter.
3. **Ticket-Pass Batch Selector**:
   - Perforated ticket stub aesthetic with visual progress rings and remaining capacity per batch (50 Mac Gemoy + 50 Fries Gemoy = 100 portions/batch).
4. **Interactive Product Cards with Sauce/Spice Customizer**:
   - High-resolution appetizing food photography + custom SVG badges.
   - Interactive **Pilihan Saus & Level Pedas** pills (*Original Cheese Lava*, *Spicy Fire Cheese*, *Mix BBQ & Cheese*) that automatically populate item notes.
   - Quick-add presets (`+1 Porsi`, `+2 Buat Bestie`) alongside the tactile `+`/`-` stepper.
5. **Social Proof & FAQ Accordion**:
   - Verified student reviews with star ratings and campus tags.
   - Collapsible FAQ accordion answering PO schedule, pickup vs campus courier, and payment verification.
6. **Dual-Mode Checkout Drawer (Database + Direct WhatsApp Vercel-Ready)**:
   - Supports full form submission (with live payment proof preview) AND a **1-Click Checkout via WhatsApp** button that formats the entire order receipt automatically.
