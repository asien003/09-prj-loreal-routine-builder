/* =========================================================
   L'ORÉAL SMART ROUTINE & PRODUCT ADVISOR
   ========================================================= */


/* =========================================================
   CONFIGURATION
   ========================================================= */

/*
 * Put your existing Cloudflare Worker URL here.
 *
 * Example:
 *
 * const WORKER_URL =
 *   "https://loreal-advisor.your-name.workers.dev";
 *
 * DO NOT put your OpenAI API key here.
 */

const WORKER_URL =
  "https://08-prj-loreal-chatbot.asien003.workers.dev";


/* LocalStorage keys */

const PRODUCTS_STORAGE_KEY =
  "loreal-selected-products";

const CHAT_STORAGE_KEY =
  "loreal-chat-history";

const DIRECTION_STORAGE_KEY =
  "loreal-direction";


/* =========================================================
   DOM ELEMENTS
   ========================================================= */

const categoryFilter =
  document.getElementById(
    "categoryFilter"
  );

const productSearch =
  document.getElementById(
    "productSearch"
  );

const productsContainer =
  document.getElementById(
    "productsContainer"
  );

const selectedProductsList =
  document.getElementById(
    "selectedProductsList"
  );

const generateRoutineBtn =
  document.getElementById(
    "generateRoutine"
  );

const clearSelectionsBtn =
  document.getElementById(
    "clearSelections"
  );

const productCount =
  document.getElementById(
    "productCount"
  );

const chatForm =
  document.getElementById(
    "chatForm"
  );

const chatWindow =
  document.getElementById(
    "chatWindow"
  );

const userInput =
  document.getElementById(
    "userInput"
  );

const rtlToggle =
  document.getElementById(
    "rtlToggle"
  );


/* =========================================================
   APPLICATION STATE
   ========================================================= */

let allProducts = [];


/*
 * Restore selected product IDs from localStorage.
 */

let selectedProductIds = JSON.parse(
  localStorage.getItem(
    PRODUCTS_STORAGE_KEY
  ) || "[]"
);


/*
 * Restore conversation history.
 */

let conversationHistory = JSON.parse(
  localStorage.getItem(
    CHAT_STORAGE_KEY
  ) || "[]"
);


/* =========================================================
   LOAD PRODUCTS
   ========================================================= */

async function loadProducts() {

  try {

    const response =
      await fetch(
        "products.json"
      );


    if (!response.ok) {

      throw new Error(
        "Unable to load products.json"
      );

    }


    const data =
      await response.json();


    allProducts =
      data.products || [];


    renderProducts();

    renderSelectedProducts();

  } catch (error) {

    console.error(error);


    productsContainer.innerHTML = `
      <div class="no-results">
        <p>
          Unable to load the product catalog.
          Please refresh the page and try again.
        </p>
      </div>
    `;

  }

}


/* =========================================================
   FILTER PRODUCTS
   ========================================================= */

function getFilteredProducts() {

  const category =
    categoryFilter.value
      .trim()
      .toLowerCase();


  const search =
    productSearch.value
      .trim()
      .toLowerCase();


  return allProducts.filter(
    (product) => {

      /*
       * Category filter
       */

      const categoryMatches =
        !category ||
        product.category
          .toLowerCase() === category;


      /*
       * Search across:
       * - name
       * - brand
       * - category
       * - description
       */

      const searchableText = `
        ${product.name}
        ${product.brand}
        ${product.category}
        ${product.description}
      `.toLowerCase();


      const searchMatches =
        !search ||
        searchableText.includes(
          search
        );


      return (
        categoryMatches &&
        searchMatches
      );

    }
  );

}


/* =========================================================
   DISPLAY PRODUCTS
   ========================================================= */

function renderProducts() {

  const products =
    getFilteredProducts();


  /*
   * Update product count.
   */

  productCount.textContent =
    `${products.length} ${
      products.length === 1
        ? "product"
        : "products"
    }`;


  /*
   * No results.
   */

  if (!products.length) {

    productsContainer.innerHTML = `
      <div class="no-results">

        <div>

          <i
            class="fa-solid fa-face-frown"
          ></i>

          <p>
            No products match your search.
          </p>

        </div>

      </div>
    `;

    return;
  }


  /*
   * Create product cards.
   */

  productsContainer.innerHTML =
    products
      .map(
        (product) => {

          const selected =
            selectedProductIds.includes(
              product.id
            );


          return `
            <article
              class="product-card ${
                selected
                  ? "selected"
                  : ""
              }"
              data-id="${product.id}"
            >

              <div
                class="product-image-wrap"
              >

                ${
                  selected
                    ? `
                      <div
                        class="selected-badge"
                      >
                        <i
                          class="fa-solid fa-check"
                        ></i>
                      </div>
                    `
                    : ""
                }


                <img
                  src="${escapeHtml(
                    product.image
                  )}"
                  alt="${escapeHtml(
                    product.name
                  )}"
                  loading="lazy"
                />

              </div>


              <div class="product-info">

                <span
                  class="product-brand"
                >
                  ${escapeHtml(
                    product.brand
                  )}
                </span>


                <h3
                  class="product-name"
                >
                  ${escapeHtml(
                    product.name
                  )}
                </h3>


                <div
                  class="product-actions"
                >

                  <button
                    class="select-btn"
                    type="button"
                    data-select="${product.id}"
                  >
                    ${
                      selected
                        ? "Selected ✓"
                        : "Add to routine"
                    }
                  </button>


                  <button
                    class="details-toggle"
                    type="button"
                    title="View product description"
                    aria-label="View product description"
                    data-details="${product.id}"
                  >
                    <i
                      class="fa-solid fa-info"
                    ></i>
                  </button>

                </div>


                <div
                  class="product-description"
                  id="description-${product.id}"
                  hidden
                >
                  ${escapeHtml(
                    product.description
                  )}
                </div>

              </div>

            </article>
          `;
        }
      )
      .join("");

}


/* =========================================================
   PRODUCT CARD CLICK EVENTS
   ========================================================= */

productsContainer.addEventListener(
  "click",
  (event) => {

    /*
     * Add / remove product button
     */

    const selectButton =
      event.target.closest(
        "[data-select]"
      );


    if (selectButton) {

      const id =
        Number(
          selectButton.dataset.select
        );


      toggleProduct(id);

      return;
    }


    /*
     * Description button
     */

    const detailsButton =
      event.target.closest(
        "[data-details]"
      );


    if (detailsButton) {

      const id =
        Number(
          detailsButton.dataset.details
        );


      const description =
        document.getElementById(
          `description-${id}`
        );


      if (description) {

        description.hidden =
          !description.hidden;

      }


      return;
    }


    /*
     * Clicking anywhere on a product card
     * also selects/deselects it.
     */

    const card =
      event.target.closest(
        ".product-card"
      );


    if (card) {

      const id =
        Number(card.dataset.id);


      toggleProduct(id);

    }

  }
);


/* =========================================================
   SELECT / UNSELECT PRODUCT
   ========================================================= */

function toggleProduct(id) {

  if (
    selectedProductIds.includes(id)
  ) {

    /*
     * Remove product.
     */

    selectedProductIds =
      selectedProductIds.filter(
        (productId) =>
          productId !== id
      );

  } else {

    /*
     * Add product.
     */

    selectedProductIds.push(id);

  }


  saveSelections();

  renderProducts();

  renderSelectedProducts();

}


/* =========================================================
   GET SELECTED PRODUCTS
   ========================================================= */

function getSelectedProducts() {

  return allProducts.filter(
    (product) =>
      selectedProductIds.includes(
        product.id
      )
  );

}


/* =========================================================
   DISPLAY SELECTED PRODUCTS
   ========================================================= */

function renderSelectedProducts() {

  const selectedProducts =
    getSelectedProducts();


  /*
   * Nothing selected.
   */

  if (!selectedProducts.length) {

    selectedProductsList.innerHTML = `
      <div class="empty-selection">

        <i
          class="fa-regular fa-heart"
        ></i>

        <p>
          Select products above to start
          building your routine.
        </p>

      </div>
    `;

    return;
  }


  /*
   * Display selected products.
   */

  selectedProductsList.innerHTML =
    selectedProducts
      .map(
        (product) => `
          <div
            class="selected-item"
          >

            <span>
              ${escapeHtml(
                product.name
              )}
            </span>


            <button
              class="remove-selected"
              type="button"
              data-remove="${product.id}"
              aria-label="Remove ${escapeHtml(
                product.name
              )}"
            >

              <i
                class="fa-solid fa-xmark"
              ></i>

            </button>

          </div>
        `
      )
      .join("");

}


/* =========================================================
   REMOVE FROM SELECTED LIST
   ========================================================= */

selectedProductsList.addEventListener(
  "click",
  (event) => {

    const button =
      event.target.closest(
        "[data-remove]"
      );


    if (!button) {
      return;
    }


    const id =
      Number(
        button.dataset.remove
      );


    toggleProduct(id);

  }
);


/* =========================================================
   CLEAR ALL SELECTIONS
   ========================================================= */

clearSelectionsBtn.addEventListener(
  "click",
  () => {

    selectedProductIds = [];


    saveSelections();

    renderProducts();

    renderSelectedProducts();

  }
);


/* =========================================================
   SAVE PRODUCT SELECTIONS
   ========================================================= */

function saveSelections() {

  localStorage.setItem(
    PRODUCTS_STORAGE_KEY,
    JSON.stringify(
      selectedProductIds
    )
  );

}


/* =========================================================
   SEARCH / FILTER EVENTS
   ========================================================= */

categoryFilter.addEventListener(
  "change",
  renderProducts
);


productSearch.addEventListener(
  "input",
  renderProducts
);


/* =========================================================
   GENERATE PERSONALIZED ROUTINE
   ========================================================= */

generateRoutineBtn.addEventListener(
  "click",
  async () => {

    /*
     * Get ONLY selected products.
     */

    const selectedProducts =
      getSelectedProducts();


    /*
     * Require at least one product.
     */

    if (!selectedProducts.length) {

      addAssistantMessage(
        "Please select at least one product before generating a routine."
      );

      return;
    }


    /*
     * Send only useful product information
     * to the Worker.
     */

    const productData =
      selectedProducts.map(
        (product) => ({
          name:
            product.name,

          brand:
            product.brand,

          category:
            product.category,

          description:
            product.description
        })
      );


    /*
     * Disable button while loading.
     */

    generateRoutineBtn.disabled =
      true;


    generateRoutineBtn.innerHTML = `
      <i
        class="fa-solid fa-spinner fa-spin"
      ></i>

      Creating Your Routine...
    `;


    const thinkingMessage =
      addAssistantMessage(
        "I'm creating your personalized routine..."
      );


    try {

      /*
       * Send selected products
       * to Cloudflare Worker.
       */

      const response =
        await fetch(
          `${WORKER_URL}/routine`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({
              products:
                productData
            })
          }
        );


      if (!response.ok) {

        throw new Error(
          "Routine request failed."
        );

      }


      const data =
        await response.json();


      /*
       * Support several possible Worker
       * response formats.
       */

      const routine =
        data.text ||
        data.output ||
        data.response ||
        "I couldn't generate your routine.";


      /*
       * Remove loading message.
       */

      thinkingMessage.remove();


      /*
       * Display routine.
       */

      addAssistantMessage(
        routine
      );


      /*
       * Save routine to conversation.
       */

      conversationHistory.push({
        role: "assistant",
        content: routine
      });


      saveChatHistory();


    } catch (error) {

      console.error(error);


      thinkingMessage.textContent =
        "Sorry — I couldn't connect to the beauty advisor. Please check your Cloudflare Worker URL and try again.";

    } finally {

      generateRoutineBtn.disabled =
        false;


      generateRoutineBtn.innerHTML = `
        <i
          class="fa-solid fa-wand-magic-sparkles"
        ></i>

        Generate My Routine
      `;

    }

  }
);


/* =========================================================
   CHAT FORM
   ========================================================= */

chatForm.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();


    const message =
      userInput.value.trim();


    if (!message) {
      return;
    }


    /*
     * Display user's message.
     */

    addUserMessage(
      message
    );


    /*
     * Clear input.
     */

    userInput.value = "";


    /*
     * Save user message.
     */

    conversationHistory.push({
      role: "user",
      content: message
    });


    saveChatHistory();


    /*
     * Display thinking message.
     */

    const thinkingMessage =
      addAssistantMessage(
        "Thinking..."
      );


    try {

      /*
       * Send full conversation history
       * to the Cloudflare Worker.
       */

      const response =
        await fetch(
          `${WORKER_URL}/chat`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({
              messages:
                conversationHistory
            })
          }
        );


      if (!response.ok) {

        throw new Error(
          "Chat request failed."
        );

      }


      const data =
        await response.json();


      const answer =
        data.text ||
        data.output ||
        data.response ||
        "I couldn't generate a response.";


      /*
       * Replace thinking message.
       */

      thinkingMessage.remove();


      /*
       * Display AI response.
       */

      addAssistantMessage(
        answer
      );


      /*
       * Save AI response.
       */

      conversationHistory.push({
        role: "assistant",
        content: answer
      });


      saveChatHistory();


    } catch (error) {

      console.error(error);


      thinkingMessage.textContent =
        "Sorry, I couldn't reach the beauty advisor. Please try again.";

    }

  }
);


/* =========================================================
   USER CHAT MESSAGE
   ========================================================= */

function addUserMessage(text) {

  const message =
    document.createElement(
      "div"
    );


  message.className =
    "chat-message user";


  message.textContent =
    text;


  chatWindow.appendChild(
    message
  );


  scrollChat();

}


/* =========================================================
   ASSISTANT CHAT MESSAGE
   ========================================================= */

function addAssistantMessage(text) {

  const message =
    document.createElement(
      "div"
    );


  message.className =
    "chat-message assistant";


  message.textContent =
    text;


  chatWindow.appendChild(
    message
  );


  scrollChat();


  return message;

}


/* =========================================================
   SCROLL CHAT TO BOTTOM
   ========================================================= */

function scrollChat() {

  chatWindow.scrollTop =
    chatWindow.scrollHeight;

}


/* =========================================================
   SAVE CHAT HISTORY
   ========================================================= */

function saveChatHistory() {

  localStorage.setItem(
    CHAT_STORAGE_KEY,
    JSON.stringify(
      conversationHistory
    )
  );

}


/* =========================================================
   RESTORE CHAT HISTORY
   ========================================================= */

function restoreChat() {

  /*
   * Don't display anything if there
   * is no saved conversation.
   */

  if (
    !conversationHistory.length
  ) {
    return;
  }


  /*
   * Hide the welcome message when
   * restoring an existing conversation.
   */

  const welcome =
    chatWindow.querySelector(
      ".welcome-message"
    );


  if (welcome) {
    welcome.remove();
  }


  conversationHistory.forEach(
    (message) => {

      if (
        message.role === "user"
      ) {

        addUserMessage(
          message.content
        );

      }


      if (
        message.role === "assistant"
      ) {

        addAssistantMessage(
          message.content
        );

      }

    }
  );

}


/* =========================================================
   RTL LANGUAGE SUPPORT
   ========================================================= */

rtlToggle.addEventListener(
  "click",
  () => {

    const html =
      document.documentElement;


    const newDirection =
      html.dir === "rtl"
        ? "ltr"
        : "rtl";


    html.dir =
      newDirection;


    localStorage.setItem(
      DIRECTION_STORAGE_KEY,
      newDirection
    );

  }
);


/* =========================================================
   RESTORE RTL SETTING
   ========================================================= */

function restoreDirection() {

  const savedDirection =
    localStorage.getItem(
      DIRECTION_STORAGE_KEY
    );


  if (savedDirection) {

    document.documentElement.dir =
      savedDirection;

  }

}


/* =========================================================
   SECURITY HELPER
   ========================================================= */

function escapeHtml(value) {

  return String(value)

    .replaceAll(
      "&",
      "&amp;"
    )

    .replaceAll(
      "<",
      "&lt;"
    )

    .replaceAll(
      ">",
      "&gt;"
    )

    .replaceAll(
      '"',
      "&quot;"
    )

    .replaceAll(
      "'",
      "&#039;"
    );

}


/* =========================================================
   START APPLICATION
   ========================================================= */

restoreDirection();

loadProducts();

restoreChat();