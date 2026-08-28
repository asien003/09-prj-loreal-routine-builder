/* =========================================================
   L'ORÉAL SMART ROUTINE & PRODUCT ADVISOR
   ========================================================= */


/* =========================================================
   CONFIGURATION
   ========================================================= */

/*
 * Cloudflare Worker URL.
 *
 * IMPORTANT:
 * Do NOT put your OpenAI API key in this file.
 * The API key should remain inside Cloudflare Worker secrets.
 */

const WORKER_URL =
  "https://08-prj-loreal-chatbot.asien003.workers.dev";


/* =========================================================
   LOCAL STORAGE KEYS
   ========================================================= */

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
  document.getElementById("categoryFilter");

const productSearch =
  document.getElementById("productSearch");

const productsContainer =
  document.getElementById("productsContainer");

const selectedProductsList =
  document.getElementById("selectedProductsList");

const generateRoutineBtn =
  document.getElementById("generateRoutine");

const clearSelectionsBtn =
  document.getElementById("clearSelections");

const productCount =
  document.getElementById("productCount");

const chatForm =
  document.getElementById("chatForm");

const chatWindow =
  document.getElementById("chatWindow");

const userInput =
  document.getElementById("userInput");

const rtlToggle =
  document.getElementById("rtlToggle");


/* =========================================================
   BASIC DOM VALIDATION
   ========================================================= */

/*
 * This helps prevent confusing errors if an HTML element
 * is missing or has the wrong ID.
 */

const requiredElements = {
  categoryFilter,
  productSearch,
  productsContainer,
  selectedProductsList,
  generateRoutineBtn,
  clearSelectionsBtn,
  productCount,
  chatForm,
  chatWindow,
  userInput,
  rtlToggle
};

Object.entries(requiredElements).forEach(
  ([name, element]) => {

    if (!element) {

      console.error(
        `Missing required HTML element: ${name}`
      );

    }

  }
);


/* =========================================================
   APPLICATION STATE
   ========================================================= */

let allProducts = [];


/* =========================================================
   RESTORE SELECTED PRODUCTS
   ========================================================= */

let selectedProductIds = loadStoredArray(
  PRODUCTS_STORAGE_KEY
);


/* =========================================================
   RESTORE CHAT HISTORY
   ========================================================= */

let conversationHistory = loadStoredArray(
  CHAT_STORAGE_KEY
);


/* =========================================================
   SAFE LOCAL STORAGE LOADER
   ========================================================= */

function loadStoredArray(key) {

  try {

    const stored =
      localStorage.getItem(key);

    if (!stored) {
      return [];
    }

    const parsed =
      JSON.parse(stored);

    return Array.isArray(parsed)
      ? parsed
      : [];

  } catch (error) {

    console.error(
      `Unable to read localStorage key "${key}":`,
      error
    );

    return [];

  }

}


/* =========================================================
   LOAD PRODUCTS
   ========================================================= */

async function loadProducts() {

  try {

    const response =
      await fetch(
        "products.json",
        {
          cache: "no-cache"
        }
      );


    if (!response.ok) {

      throw new Error(
        `Unable to load products.json (${response.status})`
      );

    }


    const data =
      await response.json();


    if (
      !data ||
      !Array.isArray(data.products)
    ) {

      throw new Error(
        "products.json does not contain a valid products array."
      );

    }


    allProducts =
      data.products;


    /*
     * Remove saved product IDs that no longer
     * exist in products.json.
     */

    const validIds =
      new Set(
        allProducts.map(
          product => product.id
        )
      );


    selectedProductIds =
      selectedProductIds.filter(
        id => validIds.has(id)
      );


    saveSelections();


    renderProducts();

    renderSelectedProducts();


  } catch (error) {

    console.error(
      "Product loading error:",
      error
    );


    if (productsContainer) {

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

}


/* =========================================================
   FILTER PRODUCTS
   ========================================================= */

function getFilteredProducts() {

  if (
    !categoryFilter ||
    !productSearch
  ) {

    return allProducts;

  }


  const category =
    categoryFilter.value
      .trim()
      .toLowerCase();


  const search =
    productSearch.value
      .trim()
      .toLowerCase();


  return allProducts.filter(
    product => {

      const productCategory =
        String(
          product.category || ""
        )
        .trim()
        .toLowerCase();


      const categoryMatches =
        !category ||
        productCategory === category;


      const searchableText = `
        ${product.name || ""}
        ${product.brand || ""}
        ${product.category || ""}
        ${product.description || ""}
      `.toLowerCase();


      const searchMatches =
        !search ||
        searchableText.includes(search);


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

  if (!productsContainer) {
    return;
  }


  const products =
    getFilteredProducts();


  /*
   * Update product count.
   */

  if (productCount) {

    productCount.textContent =
      `${products.length} ${
        products.length === 1
          ? "product"
          : "products"
      }`;

  }


  /*
   * No products found.
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
   * Render product cards.
   */

  productsContainer.innerHTML =
    products
      .map(
        product => {

          const selected =
            selectedProductIds.includes(
              product.id
            );


          const productId =
            escapeHtml(product.id);


          const productName =
            escapeHtml(
              product.name || ""
            );


          const productBrand =
            escapeHtml(
              product.brand || ""
            );


          const productImage =
            escapeHtml(
              product.image || ""
            );


          const productDescription =
            escapeHtml(
              product.description || ""
            );


          return `
            <article
              class="product-card ${
                selected
                  ? "selected"
                  : ""
              }"
              data-id="${productId}"
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
                  src="${productImage}"
                  alt="${productName}"
                  loading="lazy"
                />

              </div>


              <div class="product-info">

                <span
                  class="product-brand"
                >
                  ${productBrand}
                </span>


                <h3
                  class="product-name"
                >
                  ${productName}
                </h3>


                <div
                  class="product-actions"
                >

                  <button
                    class="select-btn"
                    type="button"
                    data-select="${productId}"
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
                    data-details="${productId}"
                  >
                    <i
                      class="fa-solid fa-info"
                    ></i>
                  </button>

                </div>


                <div
                  class="product-description"
                  id="description-${productId}"
                  hidden
                >
                  ${productDescription}
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

if (productsContainer) {

  productsContainer.addEventListener(
    "click",
    event => {

      /*
       * Add / remove product.
       */

      const selectButton =
        event.target.closest(
          "[data-select]"
        );


      if (selectButton) {

        const id =
          normalizeProductId(
            selectButton.dataset.select
          );


        if (id !== null) {

          toggleProduct(id);

        }


        return;

      }


      /*
       * Product description button.
       */

      const detailsButton =
        event.target.closest(
          "[data-details]"
        );


      if (detailsButton) {

        const id =
          normalizeProductId(
            detailsButton.dataset.details
          );


        if (id === null) {
          return;
        }


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
       * Clicking the card itself selects it.
       */

      const card =
        event.target.closest(
          ".product-card"
        );


      if (card) {

        const id =
          normalizeProductId(
            card.dataset.id
          );


        if (id !== null) {

          toggleProduct(id);

        }

      }

    }
  );

}


/* =========================================================
   NORMALIZE PRODUCT ID
   ========================================================= */

function normalizeProductId(value) {

  /*
   * Keep numeric IDs working with your existing
   * products.json structure.
   */

  const numericId =
    Number(value);


  if (
    value === undefined ||
    value === null ||
    value === "" ||
    Number.isNaN(numericId)
  ) {

    return null;

  }


  return numericId;

}


/* =========================================================
   SELECT / UNSELECT PRODUCT
   ========================================================= */

function toggleProduct(id) {

  if (
    selectedProductIds.includes(id)
  ) {

    selectedProductIds =
      selectedProductIds.filter(
        productId =>
          productId !== id
      );

  } else {

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
    product =>
      selectedProductIds.includes(
        product.id
      )
  );

}


/* =========================================================
   DISPLAY SELECTED PRODUCTS
   ========================================================= */

function renderSelectedProducts() {

  if (!selectedProductsList) {
    return;
  }


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
        product => `

          <div
            class="selected-item"
          >

            <span>
              ${escapeHtml(
                product.name || ""
              )}
            </span>


            <button
              class="remove-selected"
              type="button"
              data-remove="${escapeHtml(
                product.id
              )}"
              aria-label="Remove ${escapeHtml(
                product.name || ""
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
   REMOVE SELECTED PRODUCT
   ========================================================= */

if (selectedProductsList) {

  selectedProductsList.addEventListener(
    "click",
    event => {

      const button =
        event.target.closest(
          "[data-remove]"
        );


      if (!button) {
        return;
      }


      const id =
        normalizeProductId(
          button.dataset.remove
        );


      if (id !== null) {

        toggleProduct(id);

      }

    }
  );

}


/* =========================================================
   CLEAR ALL SELECTIONS
   ========================================================= */

if (clearSelectionsBtn) {

  clearSelectionsBtn.addEventListener(
    "click",
    () => {

      selectedProductIds = [];


      saveSelections();

      renderProducts();

      renderSelectedProducts();

    }
  );

}


/* =========================================================
   SAVE PRODUCT SELECTIONS
   ========================================================= */

function saveSelections() {

  try {

    localStorage.setItem(
      PRODUCTS_STORAGE_KEY,
      JSON.stringify(
        selectedProductIds
      )
    );

  } catch (error) {

    console.error(
      "Unable to save selected products:",
      error
    );

  }

}


/* =========================================================
   SEARCH / FILTER EVENTS
   ========================================================= */

if (categoryFilter) {

  categoryFilter.addEventListener(
    "change",
    renderProducts
  );

}


if (productSearch) {

  productSearch.addEventListener(
    "input",
    renderProducts
  );

}


/* =========================================================
   GENERATE PERSONALIZED ROUTINE
   ========================================================= */

if (generateRoutineBtn) {

  generateRoutineBtn.addEventListener(
    "click",
    generateRoutine
  );

}


/* =========================================================
   ROUTINE GENERATION FUNCTION
   ========================================================= */

async function generateRoutine() {

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
   * Send only necessary product information.
   */

  const productData =
    selectedProducts.map(
      product => ({
        name:
          product.name || "",

        brand:
          product.brand || "",

        category:
          product.category || "",

        description:
          product.description || ""
      })
    );


  /*
   * Disable button.
   */

  generateRoutineBtn.disabled =
    true;


  generateRoutineBtn.innerHTML = `
    <i
      class="fa-solid fa-spinner fa-spin"
    ></i>

    Creating Your Routine...
  `;


  /*
   * Display loading message.
   */

  const thinkingMessage =
    addAssistantMessage(
      "I'm creating your personalized routine..."
    );


  try {

    /*
     * Create messages for OpenAI.
     */

    const routineMessages = [

      {
        role: "system",

        content: `
You are an expert L'Oréal beauty advisor.

Create a personalized beauty routine using ONLY the products provided by the user.

Do not invent products.

For every selected product, explain:

1. The order in which it should be used.
2. Whether it should be used in the morning, evening, or both.
3. How often it should be used.
4. Important usage or compatibility considerations.

Organize the routine clearly.

Separate the routine into:
- Morning
- Evening
- Weekly / occasional use, if appropriate

Only include products supplied by the user.

If there is not enough information to determine a safe frequency or compatibility, say so rather than inventing details.

Keep the answer practical and easy to follow.
`
      },

      {
        role: "user",

        content: `
Please create my personalized beauty routine using these selected products:

${JSON.stringify(
  productData,
  null,
  2
)}
`
      }

    ];


    /*
     * Send request to Cloudflare Worker.
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
            messages:
              routineMessages
          })
        }
      );


    /*
     * Parse response.
     */

    const data =
      await response
        .json()
        .catch(
          () => ({})
        );


    /*
     * Handle Worker/OpenAI errors.
     */

    if (!response.ok) {

      console.error(
        "Routine Worker error:",
        data
      );


      throw new Error(
        getApiErrorMessage(
          data,
          "Routine request failed."
        )
      );

    }


    /*
     * Extract OpenAI response.
     */

    const routine =
      extractAssistantMessage(
        data
      );


    if (!routine) {

      console.error(
        "Unexpected routine response:",
        data
      );


      throw new Error(
        "The Worker returned an empty routine."
      );

    }


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
     * Save routine to chat history.
     */

    conversationHistory.push({

      role: "assistant",

      content: routine

    });


    saveChatHistory();


  } catch (error) {

    console.error(
      "Routine generation error:",
      error
    );


    thinkingMessage.textContent =
      `Sorry — I couldn't generate your routine. ${
        error.message ||
        "Please try again."
      }`;

  } finally {

    /*
     * Re-enable button.
     */

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


/* =========================================================
   CHAT FORM
   ========================================================= */

if (chatForm) {

  chatForm.addEventListener(
    "submit",
    handleChatSubmit
  );

}


/* =========================================================
   CHAT SUBMISSION
   ========================================================= */

async function handleChatSubmit(event) {

  event.preventDefault();


  if (!userInput) {
    return;
  }


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
     * Send conversation history
     * to Cloudflare Worker.
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


    /*
     * Parse response.
     */

    const data =
      await response
        .json()
        .catch(
          () => ({})
        );


    /*
     * Handle errors.
     */

    if (!response.ok) {

      console.error(
        "Chat Worker error:",
        data
      );


      throw new Error(
        getApiErrorMessage(
          data,
          "Chat request failed."
        )
      );

    }


    /*
     * IMPORTANT:
     *
     * Your Cloudflare Worker returns the OpenAI
     * Chat Completions response directly.
     *
     * Therefore the answer is located at:
     *
     * data.choices[0].message.content
     */

    const answer =
      extractAssistantMessage(
        data
      );


    if (!answer) {

      console.error(
        "Unexpected chat response:",
        data
      );


      throw new Error(
        "The Worker returned an empty response."
      );

    }


    /*
     * Remove thinking message.
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

    console.error(
      "Chat error:",
      error
    );


    thinkingMessage.textContent =
      `Sorry, I couldn't reach the beauty advisor. ${
        error.message ||
        "Please try again."
      }`;

  }

}


/* =========================================================
   EXTRACT ASSISTANT MESSAGE
   ========================================================= */

function extractAssistantMessage(data) {

  /*
   * Primary format returned by:
   *
   * POST https://api.openai.com/v1/chat/completions
   */

  const chatCompletionMessage =
    data
      ?.choices
      ?. [0]
      ?.message
      ?.content;


  if (
    typeof chatCompletionMessage ===
    "string" &&
    chatCompletionMessage.trim()
  ) {

    return chatCompletionMessage.trim();

  }


  /*
   * Support alternate response formats
   * in case the Worker is changed later.
   */

  if (
    typeof data?.text ===
    "string" &&
    data.text.trim()
  ) {

    return data.text.trim();

  }


  if (
    typeof data?.output ===
    "string" &&
    data.output.trim()
  ) {

    return data.output.trim();

  }


  if (
    typeof data?.response ===
    "string" &&
    data.response.trim()
  ) {

    return data.response.trim();

  }


  return "";

}


/* =========================================================
   API ERROR MESSAGE
   ========================================================= */

function getApiErrorMessage(
  data,
  fallback
) {

  /*
   * OpenAI error format:
   *
   * {
   *   error: {
   *     message: "..."
   *   }
   * }
   */

  if (
    typeof data?.error?.message ===
    "string"
  ) {

    return data.error.message;

  }


  /*
   * Worker may return:
   *
   * {
   *   error: "..."
   * }
   */

  if (
    typeof data?.error ===
    "string"
  ) {

    return data.error;

  }


  /*
   * Nested error format.
   */

  if (
    typeof data
      ?.details
      ?.error
      ?.message ===
    "string"
  ) {

    return data.details.error.message;

  }


  return fallback;

}


/* =========================================================
   USER CHAT MESSAGE
   ========================================================= */

function addUserMessage(text) {

  if (!chatWindow) {
    return null;
  }


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


  return message;

}


/* =========================================================
   ASSISTANT CHAT MESSAGE
   ========================================================= */

function addAssistantMessage(text) {

  if (!chatWindow) {
    return null;
  }


  /*
   * Remove welcome message when the
   * first real assistant message appears.
   */

  const welcome =
    chatWindow.querySelector(
      ".welcome-message"
    );


  if (welcome) {

    welcome.remove();

  }


  const message =
    document.createElement(
      "div"
    );


  message.className =
    "chat-message assistant";


  /*
   * textContent is intentional.
   *
   * It prevents AI-generated HTML from
   * being inserted directly into the page.
   */

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

  if (!chatWindow) {
    return;
  }


  chatWindow.scrollTop =
    chatWindow.scrollHeight;

}


/* =========================================================
   SAVE CHAT HISTORY
   ========================================================= */

function saveChatHistory() {

  try {

    localStorage.setItem(
      CHAT_STORAGE_KEY,
      JSON.stringify(
        conversationHistory
      )
    );

  } catch (error) {

    console.error(
      "Unable to save chat history:",
      error
    );

  }

}


/* =========================================================
   RESTORE CHAT HISTORY
   ========================================================= */

function restoreChat() {

  if (!chatWindow) {
    return;
  }


  /*
   * Nothing to restore.
   */

  if (
    !conversationHistory.length
  ) {

    return;

  }


  /*
   * Hide welcome message.
   */

  const welcome =
    chatWindow.querySelector(
      ".welcome-message"
    );


  if (welcome) {

    welcome.remove();

  }


  /*
   * Restore saved conversation.
   */

  conversationHistory.forEach(
    message => {

      if (
        !message ||
        typeof message.content !==
        "string"
      ) {

        return;

      }


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


  scrollChat();

}


/* =========================================================
   RTL LANGUAGE SUPPORT
   ========================================================= */

if (rtlToggle) {

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


      try {

        localStorage.setItem(
          DIRECTION_STORAGE_KEY,
          newDirection
        );

      } catch (error) {

        console.error(
          "Unable to save direction:",
          error
        );

      }

    }
  );

}


/* =========================================================
   RESTORE RTL SETTING
   ========================================================= */

function restoreDirection() {

  try {

    const savedDirection =
      localStorage.getItem(
        DIRECTION_STORAGE_KEY
      );


    if (
      savedDirection === "rtl" ||
      savedDirection === "ltr"
    ) {

      document.documentElement.dir =
        savedDirection;

    }

  } catch (error) {

    console.error(
      "Unable to restore direction:",
      error
    );

  }

}


/* =========================================================
   SECURITY HELPER
   ========================================================= */

function escapeHtml(value) {

  return String(
    value ?? ""
  )

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