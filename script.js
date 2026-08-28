/* =========================================================
   L'ORÉAL SMART ROUTINE & PRODUCT ADVISOR
   ========================================================= */


/* =========================================================
   CONFIGURATION
   ========================================================= */

/*
 * Cloudflare Worker URL
 *
 * IMPORTANT:
 * Do NOT put your OpenAI API key here.
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
   BASIC DOM CHECK
   ========================================================= */

if (
  !categoryFilter ||
  !productSearch ||
  !productsContainer ||
  !selectedProductsList ||
  !generateRoutineBtn ||
  !clearSelectionsBtn ||
  !productCount ||
  !chatForm ||
  !chatWindow ||
  !userInput ||
  !rtlToggle
) {
  console.error(
    "L'Oréal Advisor: One or more required HTML elements were not found."
  );
}


/* =========================================================
   APPLICATION STATE
   ========================================================= */

let allProducts = [];


/* =========================================================
   SAFE LOCAL STORAGE HELPERS
   ========================================================= */

function getStoredArray(key) {
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
      `Unable to read localStorage key: ${key}`,
      error
    );

    return [];
  }
}


/*
 * Restore selected products.
 */

let selectedProductIds =
  getStoredArray(
    PRODUCTS_STORAGE_KEY
  );


/*
 * Restore conversation history.
 */

let conversationHistory =
  getStoredArray(
    CHAT_STORAGE_KEY
  );


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
        `Unable to load products.json. HTTP ${response.status}`
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
     * Remove selected IDs that
     * no longer exist in products.json.
     */

    const validProductIds =
      new Set(
        allProducts.map(
          product => product.id
        )
      );

    selectedProductIds =
      selectedProductIds.filter(
        id =>
          validProductIds.has(id)
      );

    saveSelections();

    renderProducts();

    renderSelectedProducts();

  } catch (error) {
    console.error(
      "Product loading error:",
      error
    );

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
    product => {

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
  const products =
    getFilteredProducts();

  productCount.textContent =
    `${products.length} ${
      products.length === 1
        ? "product"
        : "products"
    }`;

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

  productsContainer.innerHTML =
    products
      .map(product => {

        const selected =
          selectedProductIds.includes(
            product.id
          );

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
                ${productDescription}
              </div>

            </div>

          </article>
        `;
      })
      .join("");
}


/* =========================================================
   PRODUCT CARD CLICK EVENTS
   ========================================================= */

productsContainer.addEventListener(
  "click",
  event => {

    /*
     * Add / remove product button
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

      toggleProduct(id);

      return;
    }


    /*
     * Product description button
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
     * Clicking the product card itself
     * selects / deselects the product.
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

      toggleProduct(id);
    }
  }
);


/* =========================================================
   NORMALIZE PRODUCT ID
   ========================================================= */

function normalizeProductId(value) {
  /*
   * Keep numeric IDs numeric.
   * Keep string IDs as strings.
   */

  if (
    value !== null &&
    value !== undefined &&
    value !== "" &&
    !Number.isNaN(Number(value))
  ) {
    return Number(value);
  }

  return value;
}


/* =========================================================
   SELECT / UNSELECT PRODUCT
   ========================================================= */

function toggleProduct(id) {
  const existingIndex =
    selectedProductIds.findIndex(
      productId =>
        String(productId) ===
        String(id)
    );

  if (existingIndex !== -1) {

    /*
     * Remove product.
     */

    selectedProductIds.splice(
      existingIndex,
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
    product =>
      selectedProductIds.some(
        id =>
          String(id) ===
          String(product.id)
      )
  );
}


/* =========================================================
   DISPLAY SELECTED PRODUCTS
   ========================================================= */

function renderSelectedProducts() {
  const selectedProducts =
    getSelectedProducts();

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

  selectedProductsList.innerHTML =
    selectedProducts
      .map(product => {

        const name =
          escapeHtml(
            product.name || ""
          );

        return `
          <div
            class="selected-item"
          >

            <span>
              ${name}
            </span>


            <button
              class="remove-selected"
              type="button"
              data-remove="${escapeHtml(
                product.id
              )}"
              aria-label="Remove ${name}"
            >

              <i
                class="fa-solid fa-xmark"
              ></i>

            </button>

          </div>
        `;
      })
      .join("");
}


/* =========================================================
   REMOVE FROM SELECTED LIST
   ========================================================= */

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
     * Only send useful product information
     * to the Cloudflare Worker.
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
     * Create the messages that the
     * Cloudflare Worker expects.
     */

    const routineMessages = [
      {
        role: "system",

        content: `
You are an expert L'Oréal beauty advisor.

Create a personalized beauty routine using ONLY the products provided by the user.

Do not recommend products that are not included in the user's selected products.

Explain:

1. The order in which the products should be used.
2. Whether each product should be used in the morning, evening, or both.
3. How often each product should be used.
4. Any important usage or compatibility considerations.
5. Any important precautions based only on the provided product information.

Organize the routine clearly.

Use simple headings and numbered steps so the user can easily follow the routine.

The user's selected products are provided in the next message.
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


    /*
     * Display loading message.
     */

    const thinkingMessage =
      addAssistantMessage(
        "I'm creating your personalized routine..."
      );


    try {

      /*
       * Send request to:
       *
       * /routine
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
       * Read JSON response.
       */

      const data =
        await readJsonResponse(
          response
        );


      console.log(
        "Routine response from Worker:",
        data
      );


      /*
       * If Worker/OpenAI returned an error,
       * show the actual error.
       */

      if (!response.ok) {

        const workerError =
          getWorkerErrorMessage(
            data
          );

        throw new Error(
          workerError
        );
      }


      /*
       * IMPORTANT:
       *
       * The Cloudflare Worker returns:
       *
       * {
       *   answer: "..."
       * }
       *
       * So we read data.answer first.
       */

      const routine =
        extractAnswer(
          data
        );


      /*
       * Make sure we actually received
       * a routine.
       */

      if (!routine) {

        console.error(
          "Unexpected routine response:",
          data
        );

        throw new Error(
          "The Worker returned an empty routine response."
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
       * Save routine to conversation.
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
       * Show useful error message.
       */

      thinkingMessage.textContent =
        `Sorry — I couldn't generate your routine. ${error.message || "Please try again."}`;
    }


    /*
     * Re-enable button.
     */

    finally {

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
  async event => {

    event.preventDefault();


    /*
     * Get user message.
     */

    const message =
      userInput.value.trim();


    if (!message) {
      return;
    }


    /*
     * Display user message.
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
       * Read Worker response.
       */

      const data =
        await readJsonResponse(
          response
        );


      console.log(
        "Chat response from Worker:",
        data
      );


      /*
       * Handle Worker/OpenAI errors.
       */

      if (!response.ok) {

        const workerError =
          getWorkerErrorMessage(
            data
          );

        throw new Error(
          workerError
        );
      }


      /*
       * IMPORTANT:
       *
       * Worker returns:
       *
       * {
       *   answer: "..."
       * }
       */

      const answer =
        extractAnswer(
          data
        );


      /*
       * Make sure response exists.
       */

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
       * Remove Thinking...
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
        "Chat request error:",
        error
      );


      thinkingMessage.textContent =
        `Sorry, I couldn't reach the beauty advisor. ${error.message || "Please try again."}`;
    }
  }
);


/* =========================================================
   READ JSON RESPONSE
   ========================================================= */

async function readJsonResponse(
  response
) {

  const contentType =
    response.headers.get(
      "content-type"
    ) || "";


  /*
   * Normally the Worker returns JSON.
   */

  if (
    contentType.includes(
      "application/json"
    )
  ) {
    return await response.json();
  }


  /*
   * If Cloudflare returns plain text
   * or an unexpected response.
   */

  const text =
    await response.text();

  return {
    error:
      text ||
      `HTTP ${response.status}`
  };
}


/* =========================================================
   EXTRACT WORKER ANSWER
   ========================================================= */

function extractAnswer(
  data
) {

  if (!data) {
    return "";
  }


  /*
   * PRIMARY FORMAT:
   *
   * Cloudflare Worker:
   *
   * {
   *   answer: "..."
   * }
   */

  if (
    typeof data.answer ===
    "string"
  ) {
    return data.answer.trim();
  }


  /*
   * Compatibility fallbacks.
   */

  if (
    typeof data.text ===
    "string"
  ) {
    return data.text.trim();
  }


  if (
    typeof data.output ===
    "string"
  ) {
    return data.output.trim();
  }


  if (
    typeof data.response ===
    "string"
  ) {
    return data.response.trim();
  }


  /*
   * Compatibility with a raw
   * OpenAI Chat Completions response.
   */

  if (
    data.choices &&
    Array.isArray(
      data.choices
    ) &&
    data.choices[0] &&
    data.choices[0].message &&
    typeof data.choices[0].message.content ===
      "string"
  ) {
    return data.choices[0].message.content.trim();
  }


  return "";
}


/* =========================================================
   GET WORKER ERROR MESSAGE
   ========================================================= */

function getWorkerErrorMessage(
  data
) {

  if (!data) {
    return "The Cloudflare Worker returned an unknown error.";
  }


  if (
    typeof data.error ===
    "string"
  ) {
    return data.error;
  }


  if (
    data.error &&
    typeof data.error.message ===
      "string"
  ) {
    return data.error.message;
  }


  if (
    data.details &&
    typeof data.details.message ===
      "string"
  ) {
    return data.details.message;
  }


  if (
    data.details &&
    data.details.error &&
    typeof data.details.error.message ===
      "string"
  ) {
    return data.details.error.message;
  }


  return "The Cloudflare Worker returned an error.";
}


/* =========================================================
   USER CHAT MESSAGE
   ========================================================= */

function addUserMessage(
  text
) {

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

function addAssistantMessage(
  text
) {

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
   RESTORE CHAT HISTORY
   ========================================================= */

function restoreChat() {

  /*
   * Nothing to restore.
   */

  if (
    !conversationHistory.length
  ) {
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
   * Restore messages.
   */

  conversationHistory.forEach(
    message => {

      if (
        !message ||
        !message.role ||
        typeof message.content !==
          "string"
      ) {
        return;
      }


      if (
        message.role ===
        "user"
      ) {

        addUserMessage(
          message.content
        );

        return;
      }


      if (
        message.role ===
        "assistant"
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

  if (
    savedDirection === "rtl" ||
    savedDirection === "ltr"
  ) {

    document.documentElement.dir =
      savedDirection;
  }
}


/* =========================================================
   SECURITY HELPER
   ========================================================= */

function escapeHtml(
  value
) {

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