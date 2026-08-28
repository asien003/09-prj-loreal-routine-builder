/* =========================================================
   L'ORÉAL SMART ROUTINE & PRODUCT ADVISOR
   ========================================================= */


/* =========================================================
   CONFIGURATION
   ========================================================= */

/*
 * Cloudflare Worker URL
 *
 * DO NOT put your OpenAI API key here.
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
   APPLICATION STATE
   ========================================================= */

let allProducts = [];

let selectedProductIds =
  loadSelectedProductIds();

let conversationHistory =
  loadConversationHistory();


/* =========================================================
   SAFE LOCAL STORAGE LOADING
   ========================================================= */

function loadSelectedProductIds() {

  try {

    const saved =
      localStorage.getItem(
        PRODUCTS_STORAGE_KEY
      );

    if (!saved) {
      return [];
    }

    const parsed =
      JSON.parse(saved);

    return Array.isArray(parsed)
      ? parsed
      : [];

  } catch (error) {

    console.error(
      "Unable to load selected products:",
      error
    );

    return [];

  }

}


function loadConversationHistory() {

  try {

    const saved =
      localStorage.getItem(
        CHAT_STORAGE_KEY
      );

    if (!saved) {
      return [];
    }

    const parsed =
      JSON.parse(saved);

    if (!Array.isArray(parsed)) {
      return [];
    }

    /*
     * Only keep valid OpenAI-style messages.
     */

    return parsed.filter(
      (message) =>
        message &&
        typeof message === "object" &&
        (message.role === "user" ||
          message.role === "assistant") &&
        typeof message.content === "string"
    );

  } catch (error) {

    console.error(
      "Unable to load chat history:",
      error
    );

    return [];

  }

}


/* =========================================================
   WORKER REQUEST HELPER
   ========================================================= */

/*
 * Sends a messages array to the Cloudflare Worker.
 *
 * The Worker returns:
 *
 * {
 *   answer: "..."
 * }
 *
 * Therefore this function always extracts:
 *
 * data.answer
 */

async function callWorker(
  endpoint,
  messages
) {

  const url =
    `${WORKER_URL}${endpoint}`;


  const response =
    await fetch(
      url,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({
          messages: messages
        })
      }
    );


  /*
   * Try to read JSON regardless of
   * whether the request succeeded.
   */

  let data = {};

  try {

    data =
      await response.json();

  } catch (error) {

    console.error(
      "Worker returned invalid JSON:",
      error
    );

    throw new Error(
      `Worker returned an invalid response (${response.status}).`
    );

  }


  /*
   * Worker/OpenAI returned an error.
   */

  if (!response.ok) {

    console.error(
      "Worker request failed:",
      data
    );


    const errorMessage =
      data.error ||
      data.details?.error?.message ||
      `Worker request failed with status ${response.status}.`;


    throw new Error(
      errorMessage
    );

  }


  /*
   * IMPORTANT:
   *
   * Your Cloudflare Worker returns:
   *
   * {
   *   answer: "..."
   * }
   *
   * NOT:
   *
   * {
   *   choices: [...]
   * }
   */

  const answer =
    typeof data.answer === "string"
      ? data.answer.trim()
      : "";


  if (!answer) {

    console.error(
      "Unexpected Worker response:",
      data
    );

    throw new Error(
      "The Worker returned an empty answer."
    );

  }


  return answer;

}


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

  if (!categoryFilter || !productSearch) {
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
    (product) => {

      const productCategory =
        String(
          product.category || ""
        ).toLowerCase();


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

  if (!productsContainer) {
    return;
  }


  const products =
    getFilteredProducts();


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
              data-id="${escapeHtml(
                product.id
              )}"
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
                    product.image || ""
                  )}"
                  alt="${escapeHtml(
                    product.name || "Product"
                  )}"
                  loading="lazy"
                />

              </div>


              <div class="product-info">

                <span
                  class="product-brand"
                >
                  ${escapeHtml(
                    product.brand || ""
                  )}
                </span>


                <h3
                  class="product-name"
                >
                  ${escapeHtml(
                    product.name || ""
                  )}
                </h3>


                <div
                  class="product-actions"
                >

                  <button
                    class="select-btn"
                    type="button"
                    data-select="${escapeHtml(
                      product.id
                    )}"
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
                    data-details="${escapeHtml(
                      product.id
                    )}"
                  >
                    <i
                      class="fa-solid fa-info"
                    ></i>
                  </button>

                </div>


                <div
                  class="product-description"
                  id="description-${escapeHtml(
                    product.id
                  )}"
                  hidden
                >
                  ${escapeHtml(
                    product.description || ""
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

if (productsContainer) {

  productsContainer.addEventListener(
    "click",
    (event) => {

      /*
       * Select / unselect button.
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
       * Product details button.
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


        if (id !== null) {

          const description =
            document.getElementById(
              `description-${id}`
            );


          if (description) {

            description.hidden =
              !description.hidden;

          }

        }


        return;

      }


      /*
       * Clicking the card itself selects
       * the product.
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
   * If your product IDs are numbers,
   * convert them to numbers.
   */

  const numberValue =
    Number(value);


  if (!Number.isNaN(numberValue)) {
    return numberValue;
  }


  /*
   * Otherwise keep string IDs.
   */

  if (
    typeof value === "string" &&
    value.trim()
  ) {

    return value;

  }


  return null;

}


/* =========================================================
   SELECT / UNSELECT PRODUCT
   ========================================================= */

function toggleProduct(id) {

  const index =
    selectedProductIds.indexOf(id);


  if (index !== -1) {

    /*
     * Remove product.
     */

    selectedProductIds.splice(
      index,
      1
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
        (product) => `
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
                product.name || "product"
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

if (selectedProductsList) {

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
      "Unable to save product selections:",
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


async function generateRoutine() {

  /*
   * Get selected products.
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
   * Send only the useful product information.
   */

  const productData =
    selectedProducts.map(
      (product) => ({
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
   * Create the AI instructions.
   */

  const routineMessages = [

    {
      role: "system",

      content: `
You are an expert L'Oréal beauty advisor.

Create a personalized beauty routine using ONLY the products provided by the user.

Do not recommend products that are not in the provided list.

Explain clearly:

1. The order in which the products should be used.
2. Whether each product should be used in the morning, evening, or both.
3. How often each product should be used.
4. Important usage instructions.
5. Any compatibility considerations between the selected products.

Organize the routine into clear sections such as:

MORNING ROUTINE

EVENING ROUTINE

USAGE NOTES

Keep the advice practical, clear, and easy to follow.

Do not invent product names or ingredients that were not provided.
`
    },

    {
      role: "user",

      content: `
Please create my personalized beauty routine using ONLY these selected products:

${JSON.stringify(
  productData,
  null,
  2
)}
`
    }

  ];


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
     * Call Cloudflare Worker.
     *
     * The Worker expects:
     *
     * POST /routine
     *
     * {
     *   messages: [...]
     * }
     */

    const routine =
      await callWorker(
        "/routine",
        routineMessages
      );


    /*
     * IMPORTANT:
     *
     * The Worker returns:
     *
     * {
     *   answer: "..."
     * }
     *
     * callWorker() already extracts
     * data.answer.
     */


    console.log(
      "Routine generated successfully."
    );


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
     * Save routine in chat history.
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


    /*
     * Keep the error visible.
     */

    thinkingMessage.textContent =
      `Sorry — I couldn't generate your routine. ${error.message}`;


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
   * Add message to history.
   */

  conversationHistory.push({
    role: "user",
    content: message
  });


  saveChatHistory();


  /*
   * Show thinking message.
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

    const answer =
      await callWorker(
        "/chat",
        conversationHistory
      );


    /*
     * Remove thinking message.
     */

    thinkingMessage.remove();


    /*
     * Display AI answer.
     */

    addAssistantMessage(
      answer
    );


    /*
     * Save AI answer.
     */

    conversationHistory.push({
      role: "assistant",
      content: answer
    });


    saveChatHistory();


  } catch (error) {

    console.error(
      "Chat request error:",
      error
    );


    thinkingMessage.textContent =
      `Sorry, I couldn't reach the beauty advisor. ${error.message}`;

  }

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


  /*
   * textContent prevents HTML injection.
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
   ASSISTANT CHAT MESSAGE
   ========================================================= */

function addAssistantMessage(text) {

  if (!chatWindow) {
    return null;
  }


  const message =
    document.createElement(
      "div"
    );


  message.className =
    "chat-message assistant";


  /*
   * textContent prevents HTML injection.
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
   * Don't display anything if
   * there is no saved conversation.
   */

  if (!conversationHistory.length) {
    return;
  }


  /*
   * Remove welcome message.
   */

  const welcome =
    chatWindow.querySelector(
      ".welcome-message"
    );


  if (welcome) {

    welcome.remove();

  }


  /*
   * Restore previous messages.
   */

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