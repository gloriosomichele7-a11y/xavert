"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  const elements = {
    schemaType: $("schemaType"),
    typeNote: $("typeNote"),
    schemaOrgLink: $("schemaOrgLink"),
    schemaFields: $("schemaFields"),
    addCustomPropertyBtn: $("addCustomPropertyBtn"),
    customPropertyList: $("customPropertyList"),
    generateBtn: $("generateBtn"),
    clearBtn: $("clearBtn"),
    message: $("message"),
    resultSection: $("resultSection"),
    typeStat: $("typeStat"),
    propertyStat: $("propertyStat"),
    nestedStat: $("nestedStat"),
    graphStat: $("graphStat"),
    issueStat: $("issueStat"),
    sizeStat: $("sizeStat"),
    outputModeBadge: $("outputModeBadge"),
    jsonOutput: $("jsonOutput"),
    validateBtn: $("validateBtn"),
    copyJsonBtn: $("copyJsonBtn"),
    copyScriptBtn: $("copyScriptBtn"),
    downloadJsonBtn: $("downloadJsonBtn"),
    errorCount: $("errorCount"),
    warningCount: $("warningCount"),
    infoCount: $("infoCount"),
    issueList: $("issueList"),
    graphList: $("graphList"),
    addGraphBtn: $("addGraphBtn"),
    useGraphBtn: $("useGraphBtn"),
    useCurrentBtn: $("useCurrentBtn"),
    clearGraphBtn: $("clearGraphBtn"),
  };

  const missing = Object.entries(elements)
    .filter(([, element]) => !element)
    .map(([name]) => name);

  if (missing.length) {
    console.error("Markup Generator initialization failed:", missing);
    return;
  }

  const state = {
    currentSchema: null,
    currentIssues: [],
    guidedIssues: [],
    graphNodes: [],
    outputMode: "current",
    customRowId: 0,
  };

  const commonFields = [
    {
      key: "entityId",
      label: "@id",
      type: "url",
      help: "Optional stable canonical identifier, usually an absolute page URL plus #fragment.",
    },
  ];

  const schemaConfigs = {
    Article: {
      schemaUrl: "https://schema.org/Article",
      note:
        "Article markup is used for news, sports and blog/article content. Google supports Article-related search features, but appearance is not guaranteed.",
      fields: [
        {
          key: "articleType",
          label: "Article Type",
          type: "select",
          options: ["Article", "BlogPosting", "NewsArticle"],
          value: "Article",
          required: true,
        },
        { key: "headline", label: "Headline", required: true, full: true },
        { key: "pageUrl", label: "Page URL", type: "url", recommended: true },
        { key: "description", label: "Description", type: "textarea", full: true },
        {
          key: "imageUrl",
          label: "Primary Image URL",
          type: "url",
          recommended: true,
        },
        { key: "authorName", label: "Author Name", required: true },
        { key: "authorUrl", label: "Author URL", type: "url" },
        {
          key: "datePublished",
          label: "Date Published",
          required: true,
          placeholder: "2026-08-28T10:30:00+02:00",
        },
        {
          key: "dateModified",
          label: "Date Modified",
          placeholder: "2026-08-28T12:00:00+02:00",
          recommended: true,
        },
        {
          key: "publisherName",
          label: "Publisher Name",
          recommended: true,
        },
        {
          key: "publisherLogo",
          label: "Publisher Logo URL",
          type: "url",
          recommended: true,
        },
        { key: "articleSection", label: "Article Section" },
        { key: "keywords", label: "Keywords", help: "Comma-separated keywords." },
      ],
      build(values) {
        const schema = baseSchema(values, values.articleType || "Article");
        setIf(schema, "headline", values.headline);
        setIf(schema, "url", values.pageUrl);
        setIf(schema, "description", values.description);
        if (values.imageUrl) schema.image = [values.imageUrl];
        if (values.authorName) {
          schema.author = compactObject({
            "@type": "Person",
            name: values.authorName,
            url: values.authorUrl,
          });
        }
        setIf(schema, "datePublished", values.datePublished);
        setIf(schema, "dateModified", values.dateModified);
        if (values.publisherName) {
          schema.publisher = compactObject({
            "@type": "Organization",
            name: values.publisherName,
            logo: values.publisherLogo
              ? { "@type": "ImageObject", url: values.publisherLogo }
              : undefined,
          });
        }
        setIf(schema, "articleSection", values.articleSection);
        const keywords = csv(values.keywords);
        if (keywords.length) schema.keywords = keywords;
        return schema;
      },
    },

    Product: {
      schemaUrl: "https://schema.org/Product",
      note:
        "Product markup can support richer product appearances. Google distinguishes product snippets from merchant listings; requirements vary by use case.",
      fields: [
        { key: "name", label: "Product Name", required: true },
        { key: "url", label: "Product URL", type: "url", recommended: true },
        { key: "description", label: "Description", type: "textarea", full: true },
        { key: "imageUrl", label: "Image URL", type: "url", recommended: true },
        { key: "sku", label: "SKU", recommended: true },
        { key: "brand", label: "Brand", recommended: true },
        { key: "gtin", label: "GTIN / Barcode" },
        { key: "price", label: "Price", type: "number", recommended: true },
        {
          key: "currency",
          label: "Currency",
          value: "USD",
          recommended: true,
          placeholder: "USD",
        },
        {
          key: "availability",
          label: "Availability",
          type: "select",
          options: [
            "",
            "InStock",
            "OutOfStock",
            "PreOrder",
            "BackOrder",
            "Discontinued",
          ],
          recommended: true,
        },
        {
          key: "condition",
          label: "Item Condition",
          type: "select",
          options: ["", "NewCondition", "UsedCondition", "RefurbishedCondition"],
        },
        { key: "seller", label: "Seller Name" },
        {
          key: "ratingValue",
          label: "Aggregate Rating",
          type: "number",
          help: "Usually 1–5.",
        },
        {
          key: "reviewCount",
          label: "Review Count",
          type: "number",
        },
      ],
      build(values) {
        const schema = baseSchema(values, "Product");
        setIf(schema, "name", values.name);
        setIf(schema, "url", values.url);
        setIf(schema, "description", values.description);
        if (values.imageUrl) schema.image = [values.imageUrl];
        setIf(schema, "sku", values.sku);
        if (values.brand) schema.brand = { "@type": "Brand", name: values.brand };
        setIf(schema, "gtin", values.gtin);
        if (values.price || values.currency || values.availability) {
          schema.offers = compactObject({
            "@type": "Offer",
            price: numberOrString(values.price),
            priceCurrency: upper(values.currency),
            availability: values.availability
              ? `https://schema.org/${values.availability}`
              : undefined,
            itemCondition: values.condition
              ? `https://schema.org/${values.condition}`
              : undefined,
            url: values.url,
            seller: values.seller
              ? { "@type": "Organization", name: values.seller }
              : undefined,
          });
        }
        if (values.ratingValue || values.reviewCount) {
          schema.aggregateRating = compactObject({
            "@type": "AggregateRating",
            ratingValue: numberOrString(values.ratingValue),
            reviewCount: integerOrString(values.reviewCount),
          });
        }
        return schema;
      },
    },

    LocalBusiness: {
      schemaUrl: "https://schema.org/LocalBusiness",
      note:
        "LocalBusiness describes a physical business or branch. Use the most specific accurate subtype when possible and keep the markup consistent with visible business information.",
      fields: [
        {
          key: "businessType",
          label: "Business Type",
          type: "select",
          options: [
            "LocalBusiness",
            "Restaurant",
            "Store",
            "Hotel",
            "LegalService",
            "RealEstateAgent",
            "MedicalBusiness",
            "Dentist",
          ],
          value: "LocalBusiness",
          required: true,
        },
        { key: "name", label: "Business Name", required: true },
        { key: "url", label: "Website URL", type: "url", recommended: true },
        { key: "imageUrl", label: "Image URL", type: "url" },
        { key: "telephone", label: "Telephone", recommended: true },
        { key: "priceRange", label: "Price Range", placeholder: "$$" },
        { key: "streetAddress", label: "Street Address", required: true },
        { key: "locality", label: "City / Locality", required: true },
        { key: "region", label: "Region / State" },
        { key: "postalCode", label: "Postal Code" },
        { key: "country", label: "Country Code / Name", required: true },
        { key: "latitude", label: "Latitude", type: "number" },
        { key: "longitude", label: "Longitude", type: "number" },
        {
          key: "openingHours",
          label: "Opening Hours",
          type: "textarea",
          full: true,
          help: "One Schema.org opening-hours string per line, e.g. Mo-Fr 09:00-17:00.",
        },
      ],
      build(values) {
        const schema = baseSchema(
          values,
          values.businessType || "LocalBusiness",
        );
        setIf(schema, "name", values.name);
        setIf(schema, "url", values.url);
        if (values.imageUrl) schema.image = [values.imageUrl];
        setIf(schema, "telephone", values.telephone);
        setIf(schema, "priceRange", values.priceRange);
        schema.address = compactObject({
          "@type": "PostalAddress",
          streetAddress: values.streetAddress,
          addressLocality: values.locality,
          addressRegion: values.region,
          postalCode: values.postalCode,
          addressCountry: values.country,
        });
        if (values.latitude || values.longitude) {
          schema.geo = compactObject({
            "@type": "GeoCoordinates",
            latitude: numberOrString(values.latitude),
            longitude: numberOrString(values.longitude),
          });
        }
        const hours = lines(values.openingHours);
        if (hours.length) schema.openingHours = hours;
        return schema;
      },
    },

    Organization: {
      schemaUrl: "https://schema.org/Organization",
      note:
        "Organization markup describes a company, institution or other organization. Stable URLs and sameAs profiles can help connect entity information.",
      fields: [
        { key: "name", label: "Organization Name", required: true },
        { key: "url", label: "Website URL", type: "url", recommended: true },
        { key: "logo", label: "Logo URL", type: "url", recommended: true },
        { key: "description", label: "Description", type: "textarea", full: true },
        { key: "email", label: "Email" },
        { key: "telephone", label: "Telephone" },
        {
          key: "sameAs",
          label: "sameAs URLs",
          type: "textarea",
          full: true,
          help: "One official profile or reference URL per line.",
        },
      ],
      build(values) {
        const schema = baseSchema(values, "Organization");
        setIf(schema, "name", values.name);
        setIf(schema, "url", values.url);
        setIf(schema, "logo", values.logo);
        setIf(schema, "description", values.description);
        setIf(schema, "email", values.email);
        setIf(schema, "telephone", values.telephone);
        const sameAs = lines(values.sameAs);
        if (sameAs.length) schema.sameAs = sameAs;
        return schema;
      },
    },

    WebSite: {
      schemaUrl: "https://schema.org/WebSite",
      note:
        "WebSite markup describes the site itself. Keep name, URL and publisher consistent with your canonical site identity.",
      fields: [
        { key: "name", label: "Site Name", required: true },
        { key: "url", label: "Site URL", type: "url", required: true },
        { key: "alternateName", label: "Alternate Name" },
        { key: "publisherName", label: "Publisher Name", recommended: true },
        { key: "publisherUrl", label: "Publisher URL", type: "url" },
        { key: "language", label: "Language", value: "en", placeholder: "en" },
      ],
      build(values) {
        const schema = baseSchema(values, "WebSite");
        setIf(schema, "name", values.name);
        setIf(schema, "url", values.url);
        setIf(schema, "alternateName", values.alternateName);
        setIf(schema, "inLanguage", values.language);
        if (values.publisherName) {
          schema.publisher = compactObject({
            "@type": "Organization",
            name: values.publisherName,
            url: values.publisherUrl,
          });
        }
        return schema;
      },
    },

    BreadcrumbList: {
      schemaUrl: "https://schema.org/BreadcrumbList",
      note:
        "BreadcrumbList represents the page's position in a site hierarchy. Google supports breadcrumb markup in search results.",
      fields: [],
      repeaters: [
        {
          key: "breadcrumbs",
          title: "Breadcrumb Items",
          kind: "breadcrumb",
          addLabel: "Add Breadcrumb",
          minimum: 2,
        },
      ],
      build(values, repeaters) {
        const schema = baseSchema(values, "BreadcrumbList");
        schema.itemListElement = (repeaters.breadcrumbs || []).map(
          (item, index) =>
            compactObject({
              "@type": "ListItem",
              position: index + 1,
              name: item.name,
              item: item.url,
            }),
        );
        return schema;
      },
    },

    FAQPage: {
      schemaUrl: "https://schema.org/FAQPage",
      note:
        "FAQPage is valid Schema.org markup, but Google FAQ rich results are generally limited to well-known authoritative government and health sites.",
      fields: [],
      repeaters: [
        {
          key: "faq",
          title: "Questions & Answers",
          kind: "faq",
          addLabel: "Add Question",
          minimum: 1,
        },
      ],
      build(values, repeaters) {
        const schema = baseSchema(values, "FAQPage");
        schema.mainEntity = (repeaters.faq || []).map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer,
          },
        }));
        return schema;
      },
    },

    Event: {
      schemaUrl: "https://schema.org/Event",
      note:
        "Event markup can support event search features when the event is real, publicly accessible and the page follows the applicable guidelines.",
      fields: [
        { key: "name", label: "Event Name", required: true },
        {
          key: "startDate",
          label: "Start Date",
          required: true,
          placeholder: "2026-10-10T19:00:00+02:00",
        },
        {
          key: "endDate",
          label: "End Date",
          placeholder: "2026-10-10T22:00:00+02:00",
        },
        {
          key: "eventStatus",
          label: "Event Status",
          type: "select",
          options: [
            "",
            "EventScheduled",
            "EventCancelled",
            "EventPostponed",
            "EventRescheduled",
            "EventMovedOnline",
          ],
        },
        {
          key: "attendanceMode",
          label: "Attendance Mode",
          type: "select",
          options: [
            "",
            "OfflineEventAttendanceMode",
            "OnlineEventAttendanceMode",
            "MixedEventAttendanceMode",
          ],
        },
        { key: "url", label: "Event URL", type: "url", recommended: true },
        { key: "imageUrl", label: "Image URL", type: "url", recommended: true },
        { key: "description", label: "Description", type: "textarea", full: true },
        { key: "locationName", label: "Location Name", recommended: true },
        { key: "locationAddress", label: "Location Address", full: true },
        { key: "organizerName", label: "Organizer Name" },
        { key: "organizerUrl", label: "Organizer URL", type: "url" },
        { key: "price", label: "Ticket Price", type: "number" },
        { key: "currency", label: "Currency", value: "USD" },
        { key: "offerUrl", label: "Ticket URL", type: "url" },
      ],
      build(values) {
        const schema = baseSchema(values, "Event");
        setIf(schema, "name", values.name);
        setIf(schema, "startDate", values.startDate);
        setIf(schema, "endDate", values.endDate);
        if (values.eventStatus) {
          schema.eventStatus = `https://schema.org/${values.eventStatus}`;
        }
        if (values.attendanceMode) {
          schema.eventAttendanceMode =
            `https://schema.org/${values.attendanceMode}`;
        }
        setIf(schema, "url", values.url);
        if (values.imageUrl) schema.image = [values.imageUrl];
        setIf(schema, "description", values.description);
        if (values.locationName || values.locationAddress) {
          schema.location = compactObject({
            "@type": "Place",
            name: values.locationName,
            address: values.locationAddress,
          });
        }
        if (values.organizerName) {
          schema.organizer = compactObject({
            "@type": "Organization",
            name: values.organizerName,
            url: values.organizerUrl,
          });
        }
        if (values.price || values.offerUrl) {
          schema.offers = compactObject({
            "@type": "Offer",
            price: numberOrString(values.price),
            priceCurrency: upper(values.currency),
            url: values.offerUrl || values.url,
            availability: "https://schema.org/InStock",
          });
        }
        return schema;
      },
    },

    SoftwareApplication: {
      schemaUrl: "https://schema.org/SoftwareApplication",
      note:
        "SoftwareApplication describes software products and apps. Use accurate application category, operating system, offer and rating data when present on the page.",
      fields: [
        { key: "name", label: "Application Name", required: true },
        { key: "url", label: "Application URL", type: "url", recommended: true },
        { key: "description", label: "Description", type: "textarea", full: true },
        { key: "imageUrl", label: "Image URL", type: "url" },
        {
          key: "operatingSystem",
          label: "Operating System",
          recommended: true,
          placeholder: "Web Browser, Windows, macOS, Android...",
        },
        {
          key: "applicationCategory",
          label: "Application Category",
          recommended: true,
          placeholder: "UtilitiesApplication",
        },
        { key: "softwareVersion", label: "Software Version" },
        { key: "price", label: "Price", type: "number" },
        { key: "currency", label: "Currency", value: "USD" },
        { key: "ratingValue", label: "Aggregate Rating", type: "number" },
        { key: "ratingCount", label: "Rating Count", type: "number" },
      ],
      build(values) {
        const schema = baseSchema(values, "SoftwareApplication");
        setIf(schema, "name", values.name);
        setIf(schema, "url", values.url);
        setIf(schema, "description", values.description);
        setIf(schema, "image", values.imageUrl);
        setIf(schema, "operatingSystem", values.operatingSystem);
        setIf(schema, "applicationCategory", values.applicationCategory);
        setIf(schema, "softwareVersion", values.softwareVersion);
        if (values.price || values.currency) {
          schema.offers = compactObject({
            "@type": "Offer",
            price: numberOrString(values.price || "0"),
            priceCurrency: upper(values.currency),
          });
        }
        if (values.ratingValue || values.ratingCount) {
          schema.aggregateRating = compactObject({
            "@type": "AggregateRating",
            ratingValue: numberOrString(values.ratingValue),
            ratingCount: integerOrString(values.ratingCount),
          });
        }
        return schema;
      },
    },

    VideoObject: {
      schemaUrl: "https://schema.org/VideoObject",
      note:
        "VideoObject describes a video and can support video search features when thumbnail, upload date and video access information are accurate.",
      fields: [
        { key: "name", label: "Video Name", required: true },
        { key: "description", label: "Description", type: "textarea", full: true, required: true },
        { key: "thumbnailUrl", label: "Thumbnail URL", type: "url", required: true },
        {
          key: "uploadDate",
          label: "Upload Date",
          required: true,
          placeholder: "2026-08-28T10:00:00+02:00",
        },
        {
          key: "duration",
          label: "Duration",
          recommended: true,
          placeholder: "PT2M30S",
          help: "ISO 8601 duration.",
        },
        { key: "contentUrl", label: "Content URL", type: "url", recommended: true },
        { key: "embedUrl", label: "Embed URL", type: "url", recommended: true },
        { key: "publisherName", label: "Publisher Name" },
      ],
      build(values) {
        const schema = baseSchema(values, "VideoObject");
        setIf(schema, "name", values.name);
        setIf(schema, "description", values.description);
        setIf(schema, "thumbnailUrl", values.thumbnailUrl);
        setIf(schema, "uploadDate", values.uploadDate);
        setIf(schema, "duration", values.duration);
        setIf(schema, "contentUrl", values.contentUrl);
        setIf(schema, "embedUrl", values.embedUrl);
        if (values.publisherName) {
          schema.publisher = {
            "@type": "Organization",
            name: values.publisherName,
          };
        }
        return schema;
      },
    },

    Recipe: {
      schemaUrl: "https://schema.org/Recipe",
      note:
        "Recipe markup can support recipe search features. Ingredient, instruction, timing and image data should match the recipe visible on the page.",
      fields: [
        { key: "name", label: "Recipe Name", required: true },
        { key: "imageUrl", label: "Image URL", type: "url", required: true },
        { key: "description", label: "Description", type: "textarea", full: true },
        { key: "authorName", label: "Author Name", recommended: true },
        { key: "datePublished", label: "Date Published", placeholder: "2026-08-28" },
        { key: "prepTime", label: "Prep Time", placeholder: "PT15M" },
        { key: "cookTime", label: "Cook Time", placeholder: "PT30M" },
        { key: "totalTime", label: "Total Time", placeholder: "PT45M" },
        { key: "recipeYield", label: "Yield", placeholder: "4 servings" },
        { key: "recipeCategory", label: "Category", placeholder: "Dinner" },
        { key: "recipeCuisine", label: "Cuisine", placeholder: "Italian" },
        { key: "calories", label: "Calories", placeholder: "450 calories" },
      ],
      repeaters: [
        {
          key: "ingredients",
          title: "Ingredients",
          kind: "single",
          addLabel: "Add Ingredient",
          minimum: 1,
          placeholder: "2 cups flour",
        },
        {
          key: "instructions",
          title: "Instructions",
          kind: "single",
          addLabel: "Add Step",
          minimum: 1,
          placeholder: "Mix the ingredients.",
        },
      ],
      build(values, repeaters) {
        const schema = baseSchema(values, "Recipe");
        setIf(schema, "name", values.name);
        if (values.imageUrl) schema.image = [values.imageUrl];
        setIf(schema, "description", values.description);
        if (values.authorName) {
          schema.author = { "@type": "Person", name: values.authorName };
        }
        setIf(schema, "datePublished", values.datePublished);
        setIf(schema, "prepTime", values.prepTime);
        setIf(schema, "cookTime", values.cookTime);
        setIf(schema, "totalTime", values.totalTime);
        setIf(schema, "recipeYield", values.recipeYield);
        setIf(schema, "recipeCategory", values.recipeCategory);
        setIf(schema, "recipeCuisine", values.recipeCuisine);
        if (values.calories) {
          schema.nutrition = {
            "@type": "NutritionInformation",
            calories: values.calories,
          };
        }
        schema.recipeIngredient = (repeaters.ingredients || [])
          .map((item) => item.value)
          .filter(Boolean);
        schema.recipeInstructions = (repeaters.instructions || [])
          .map((item) => item.value)
          .filter(Boolean)
          .map((text) => ({ "@type": "HowToStep", text }));
        return schema;
      },
    },
  };

  function baseSchema(values, type) {
    const schema = {
      "@context": "https://schema.org",
      "@type": type,
    };

    setIf(schema, "@id", values.entityId);
    return schema;
  }

  function compactObject(object) {
    return Object.fromEntries(
      Object.entries(object).filter(
        ([, value]) =>
          value !== undefined &&
          value !== null &&
          value !== "" &&
          !(Array.isArray(value) && value.length === 0),
      ),
    );
  }

  function setIf(object, key, value) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      object[key] = value;
    }
  }

  function lines(value) {
    return String(value || "")
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function csv(value) {
    return String(value || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function upper(value) {
    return String(value || "").trim().toUpperCase();
  }

  function numberOrString(value) {
    const text = String(value ?? "").trim();

    if (!text) return undefined;

    const number = Number(text);
    return Number.isFinite(number) ? number : text;
  }

  function integerOrString(value) {
    const text = String(value ?? "").trim();

    if (!text) return undefined;

    const number = Number(text);
    return Number.isInteger(number) ? number : text;
  }

  function createField(field) {
    const wrapper = document.createElement("div");
    wrapper.className = `form-group${field.full ? " schema-field-full" : ""}`;
    wrapper.dataset.fieldKey = field.key;

    const labelRow = document.createElement("div");
    labelRow.className = "schema-label-row";

    const label = document.createElement("label");
    label.htmlFor = `schema-field-${field.key}`;
    label.textContent = field.label;

    const requirement = document.createElement("span");
    requirement.className = "schema-requirement";

    if (field.required) {
      requirement.textContent = "Required";
      requirement.classList.add("schema-requirement-required");
    } else if (field.recommended) {
      requirement.textContent = "Recommended";
    } else {
      requirement.textContent = "Optional";
    }

    labelRow.append(label, requirement);
    wrapper.appendChild(labelRow);

    let control;

    if (field.type === "textarea") {
      control = document.createElement("textarea");
      control.rows = 3;
    } else if (field.type === "select") {
      control = document.createElement("select");

      field.options.forEach((option) => {
        const optionElement = document.createElement("option");
        optionElement.value = option;
        optionElement.textContent = option || "—";
        control.appendChild(optionElement);
      });
    } else {
      control = document.createElement("input");
      control.type =
        field.type === "number" ? "number" : field.type === "url" ? "url" : "text";

      if (field.type === "number") {
        control.step = "any";
      }
    }

    control.id = `schema-field-${field.key}`;
    control.dataset.schemaField = field.key;
    control.spellcheck = false;

    if (field.placeholder) control.placeholder = field.placeholder;
    if (field.value !== undefined) control.value = field.value;

    wrapper.appendChild(control);

    if (field.help) {
      const help = document.createElement("p");
      help.className = "schema-help";
      help.textContent = field.help;
      wrapper.appendChild(help);
    }

    return wrapper;
  }

  function createRepeaterSection(definition) {
    const section = document.createElement("section");
    section.className = "schema-repeat-section";
    section.dataset.repeaterKey = definition.key;

    const head = document.createElement("div");
    head.className = "schema-repeat-head";

    const title = document.createElement("h4");
    title.className = "schema-repeat-title";
    title.textContent = definition.title;

    const add = document.createElement("button");
    add.type = "button";
    add.className = "btn btn-secondary";
    add.textContent = definition.addLabel;
    add.addEventListener("click", () => {
      addRepeaterRow(section, definition);
      invalidateGeneratedResult();
    });

    head.append(title, add);

    const list = document.createElement("div");
    list.className = "schema-repeat-list";
    list.dataset.repeaterList = definition.key;

    section.append(head, list);

    const minimum = Math.max(1, definition.minimum || 1);
    for (let index = 0; index < minimum; index += 1) {
      addRepeaterRow(section, definition);
    }

    return section;
  }

  function addRepeaterRow(section, definition, values = {}) {
    const list = section.querySelector(
      `[data-repeater-list="${definition.key}"]`,
    );
    if (!list) return;

    const row = document.createElement("div");
    row.className =
      `schema-repeat-row${definition.kind === "faq" ? " schema-faq-row" : ""}`;
    row.dataset.repeaterRow = definition.key;

    if (definition.kind === "faq") {
      const question = document.createElement("input");
      question.type = "text";
      question.placeholder = "Question";
      question.dataset.repeatField = "question";
      question.value = values.question || "";

      const answer = document.createElement("textarea");
      answer.placeholder = "Accepted answer";
      answer.dataset.repeatField = "answer";
      answer.value = values.answer || "";

      row.append(question, answer);
    } else if (definition.kind === "breadcrumb") {
      const name = document.createElement("input");
      name.type = "text";
      name.placeholder = "Breadcrumb name";
      name.dataset.repeatField = "name";
      name.value = values.name || "";

      const url = document.createElement("input");
      url.type = "url";
      url.placeholder = "https://example.com/path";
      url.dataset.repeatField = "url";
      url.value = values.url || "";

      row.append(name, url);
    } else {
      const input = document.createElement("input");
      input.type = "text";
      input.placeholder = definition.placeholder || "Value";
      input.dataset.repeatField = "value";
      input.value = values.value || "";
      row.appendChild(input);
    }

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "btn btn-secondary schema-remove-btn";
    remove.textContent = "×";
    remove.title = "Remove item";
    remove.setAttribute("aria-label", "Remove item");
    remove.addEventListener("click", () => {
      if (list.children.length <= Math.max(1, definition.minimum || 1)) {
        Array.from(row.querySelectorAll("[data-repeat-field]")).forEach(
          (control) => {
            control.value = "";
          },
        );
      } else {
        row.remove();
      }
      invalidateGeneratedResult();
    });

    row.appendChild(remove);
    list.appendChild(row);

    Array.from(row.querySelectorAll("input, textarea")).forEach((control) => {
      control.addEventListener("input", invalidateGeneratedResult);
    });
  }

  function renderType() {
    const type = elements.schemaType.value;
    const config = schemaConfigs[type];
    elements.schemaFields.replaceChildren();
    elements.typeNote.replaceChildren();

    const strong = document.createElement("strong");
    strong.textContent = `${type}: `;
    elements.typeNote.append(strong, document.createTextNode(config.note));

    elements.schemaOrgLink.href = config.schemaUrl;

    [...commonFields, ...(config.fields || [])].forEach((field) => {
      elements.schemaFields.appendChild(createField(field));
    });

    (config.repeaters || []).forEach((definition) => {
      elements.schemaFields.appendChild(createRepeaterSection(definition));
    });

    elements.schemaFields
      .querySelectorAll("input, textarea, select")
      .forEach((control) => {
        const eventName =
          control.tagName === "SELECT" ? "change" : "input";
        control.addEventListener(eventName, invalidateGeneratedResult);
      });

    renderCustomRows([]);
    state.currentSchema = null;
    state.currentIssues = [];
    state.guidedIssues = [];
    elements.resultSection.hidden = true;
    clearInlineMessage();
  }

  function getFieldValues() {
    const values = {};

    elements.schemaFields
      .querySelectorAll("[data-schema-field]")
      .forEach((control) => {
        values[control.dataset.schemaField] = control.value.trim();
      });

    return values;
  }

  function getRepeaterValues() {
    const output = {};
    const config = schemaConfigs[elements.schemaType.value];

    (config.repeaters || []).forEach((definition) => {
      const section = elements.schemaFields.querySelector(
        `[data-repeater-key="${definition.key}"]`,
      );

      const rows = [];

      section?.querySelectorAll("[data-repeater-row]").forEach((row) => {
        const item = {};

        row.querySelectorAll("[data-repeat-field]").forEach((control) => {
          item[control.dataset.repeatField] = control.value.trim();
        });

        if (Object.values(item).some(Boolean)) {
          rows.push(item);
        }
      });

      output[definition.key] = rows;
    });

    return output;
  }

  function createCustomRow(values = {}) {
    state.customRowId += 1;

    const row = document.createElement("div");
    row.className = "schema-custom-row";
    row.dataset.customRow = String(state.customRowId);

    const property = document.createElement("input");
    property.type = "text";
    property.placeholder = "propertyName";
    property.value = values.property || "";
    property.dataset.customField = "property";

    const type = document.createElement("select");
    type.dataset.customField = "type";

    [
      ["text", "Text"],
      ["url", "URL"],
      ["number", "Number"],
      ["boolean", "Boolean"],
      ["json", "JSON"],
    ].forEach(([value, label]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      type.appendChild(option);
    });

    type.value = values.type || "text";

    const value = document.createElement("input");
    value.type = "text";
    value.placeholder =
      values.type === "json" ? '{"@type":"Thing"}' : "Value";
    value.value = values.value || "";
    value.dataset.customField = "value";

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "btn btn-secondary schema-remove-btn";
    remove.textContent = "×";
    remove.title = "Remove property";
    remove.setAttribute("aria-label", "Remove custom property");
    remove.addEventListener("click", () => {
      row.remove();
      invalidateGeneratedResult();
    });

    [property, type, value].forEach((control) => {
      control.addEventListener(
        control.tagName === "SELECT" ? "change" : "input",
        () => {
          if (control === type) {
            value.placeholder =
              type.value === "json" ? '{"@type":"Thing"}' : "Value";
          }
          invalidateGeneratedResult();
        },
      );
    });

    row.append(property, type, value, remove);
    elements.customPropertyList.appendChild(row);
  }

  function renderCustomRows(rows) {
    elements.customPropertyList.replaceChildren();

    if (!rows.length) {
      createCustomRow();
      return;
    }

    rows.forEach(createCustomRow);
  }

  function getCustomProperties(issues) {
    const properties = {};

    elements.customPropertyList
      .querySelectorAll("[data-custom-row]")
      .forEach((row) => {
        const property = row
          .querySelector('[data-custom-field="property"]')
          ?.value.trim();
        const type = row
          .querySelector('[data-custom-field="type"]')
          ?.value;
        const raw = row
          .querySelector('[data-custom-field="value"]')
          ?.value.trim();

        if (!property && !raw) return;

        if (!property) {
          issues.push({
            level: "warning",
            message: "A custom property has a value but no property name.",
          });
          return;
        }

        if (!raw) {
          issues.push({
            level: "warning",
            message: `Custom property "${property}" is empty and was skipped.`,
          });
          return;
        }

        let value = raw;

        try {
          if (type === "number") {
            const number = Number(raw);
            if (!Number.isFinite(number)) throw new Error();
            value = number;
          } else if (type === "boolean") {
            if (!/^(true|false)$/i.test(raw)) throw new Error();
            value = /^true$/i.test(raw);
          } else if (type === "json") {
            value = JSON.parse(raw);
          }
        } catch {
          issues.push({
            level: "error",
            message: `Custom property "${property}" has an invalid ${type} value.`,
          });
          return;
        }

        properties[property] = value;
      });

    return properties;
  }

  function validateUrl(value) {
    if (!value) return true;

    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }

  function validateGuidedFields(values, repeaters, config) {
    const issues = [];
    const allFields = [...commonFields, ...(config.fields || [])];

    allFields.forEach((field) => {
      const value = values[field.key];

      if (field.required && !value) {
        issues.push({
          level: "error",
          message: `${field.label} is required by this guided template.`,
        });
      } else if (field.recommended && !value) {
        issues.push({
          level: "warning",
          message: `${field.label} is recommended for a more complete implementation.`,
        });
      }

      if (field.type === "url" && value && !validateUrl(value)) {
        issues.push({
          level: "error",
          message: `${field.label} must be an absolute HTTP(S) URL.`,
        });
      }
    });

    (config.repeaters || []).forEach((definition) => {
      const rows = repeaters[definition.key] || [];

      if (rows.length < (definition.minimum || 0)) {
        issues.push({
          level: "error",
          message: `${definition.title} requires at least ${definition.minimum} item(s).`,
        });
      }

      rows.forEach((row, index) => {
        if (
          definition.kind === "faq" &&
          (!row.question || !row.answer)
        ) {
          issues.push({
            level: "error",
            message: `FAQ item ${index + 1} needs both a question and an answer.`,
          });
        }

        if (
          definition.kind === "breadcrumb" &&
          (!row.name || !row.url)
        ) {
          issues.push({
            level: "error",
            message: `Breadcrumb item ${index + 1} needs both a name and URL.`,
          });
        }

        if (
          definition.kind === "breadcrumb" &&
          row.url &&
          !validateUrl(row.url)
        ) {
          issues.push({
            level: "error",
            message: `Breadcrumb item ${index + 1} URL must be absolute HTTP(S).`,
          });
        }
      });
    });

    if (elements.schemaType.value === "Product") {
      if (values.currency && !/^[A-Za-z]{3}$/.test(values.currency)) {
        issues.push({
          level: "warning",
          message: "Product currency should normally use a 3-letter ISO 4217 code.",
        });
      }

      if (values.ratingValue) {
        const rating = Number(values.ratingValue);
        if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
          issues.push({
            level: "warning",
            message: "Aggregate rating is commonly expressed on a 1–5 scale unless bestRating/worstRating are specified.",
          });
        }
      }
    }

    if (elements.schemaType.value === "LocalBusiness") {
      const lat = values.latitude ? Number(values.latitude) : null;
      const lng = values.longitude ? Number(values.longitude) : null;

      if ((values.latitude && !Number.isFinite(lat)) || (lat !== null && (lat < -90 || lat > 90))) {
        issues.push({
          level: "error",
          message: "Latitude must be between -90 and 90.",
        });
      }

      if ((values.longitude && !Number.isFinite(lng)) || (lng !== null && (lng < -180 || lng > 180))) {
        issues.push({
          level: "error",
          message: "Longitude must be between -180 and 180.",
        });
      }
    }

    if (elements.schemaType.value === "FAQPage") {
      issues.push({
        level: "info",
        message:
          "Google FAQ rich results are generally limited to well-known authoritative government and health sites.",
      });
    }

    issues.push({
      level: "info",
      message:
        "Passing these local checks does not guarantee a Google rich result. Validate deployed markup with the applicable official testing tool.",
    });

    return issues;
  }

  function applyCustomProperties(schema, custom, issues) {
    Object.entries(custom).forEach(([property, value]) => {
      if (Object.prototype.hasOwnProperty.call(schema, property)) {
        issues.push({
          level: "warning",
          message: `Custom property "${property}" was skipped because the guided schema already generated it.`,
        });
        return;
      }

      schema[property] = value;
    });
  }

  function generateSchema({ announce = true } = {}) {
    const type = elements.schemaType.value;
    const config = schemaConfigs[type];
    const values = getFieldValues();
    const repeaters = getRepeaterValues();
    const issues = validateGuidedFields(values, repeaters, config);
    const custom = getCustomProperties(issues);

    let schema;

    try {
      schema = config.build(values, repeaters);
      applyCustomProperties(schema, custom, issues);
    } catch (error) {
      console.error("Schema generation failed:", error);
      notify("The schema could not be generated from the current values.", "error");
      return false;
    }

    state.currentSchema = schema;
    state.currentIssues = issues;
    state.guidedIssues = issues;
    state.outputMode = "current";

    elements.jsonOutput.value = JSON.stringify(schema, null, 2);
    elements.outputModeBadge.textContent = "Current schema";
    elements.resultSection.hidden = false;

    renderResultStats(schema, issues);
    renderIssues(issues);
    renderGraph();

    if (announce) {
      const errors = issues.filter((issue) => issue.level === "error").length;

      if (errors > 0) {
        notify(
          `Schema generated with ${errors} validation error${errors === 1 ? "" : "s"}. Review the highlighted issues before deployment.`,
          "error",
        );
      } else {
        showActionSuccess("Schema generated successfully.");
      }
    }

    return true;
  }

  function countProperties(value) {
    let count = 0;

    if (Array.isArray(value)) {
      value.forEach((item) => {
        count += countProperties(item);
      });
      return count;
    }

    if (value && typeof value === "object") {
      Object.entries(value).forEach(([key, child]) => {
        if (key !== "@context") count += 1;
        count += countProperties(child);
      });
    }

    return count;
  }

  function countNestedObjects(value, isRoot = true) {
    let count = 0;

    if (Array.isArray(value)) {
      value.forEach((item) => {
        count += countNestedObjects(item, false);
      });
      return count;
    }

    if (value && typeof value === "object") {
      if (!isRoot) count += 1;

      Object.values(value).forEach((child) => {
        count += countNestedObjects(child, false);
      });
    }

    return count;
  }

  function utf8Size(text) {
    return new TextEncoder().encode(String(text || "")).byteLength;
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";

    const units = ["B", "KB", "MB"];
    const power = Math.min(
      Math.floor(Math.log(bytes) / Math.log(1024)),
      units.length - 1,
    );
    const value = bytes / 1024 ** power;

    return `${value >= 10 || power === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[power]}`;
  }

  function renderResultStats(schema, issues) {
    const errors = issues.filter((issue) => issue.level === "error").length;
    const warnings = issues.filter((issue) => issue.level === "warning").length;

    elements.typeStat.textContent = Array.isArray(schema["@graph"])
      ? "@graph"
      : Array.isArray(schema["@type"])
        ? schema["@type"].join(", ")
        : String(schema["@type"] || "—");
    elements.propertyStat.textContent =
      new Intl.NumberFormat("en-US").format(countProperties(schema));
    elements.nestedStat.textContent =
      new Intl.NumberFormat("en-US").format(countNestedObjects(schema));
    elements.graphStat.textContent =
      new Intl.NumberFormat("en-US").format(state.graphNodes.length);
    elements.issueStat.textContent =
      new Intl.NumberFormat("en-US").format(errors + warnings);
    elements.sizeStat.textContent = formatBytes(
      utf8Size(elements.jsonOutput.value),
    );
  }

  function renderIssues(issues) {
    elements.issueList.replaceChildren();

    const errors = issues.filter((issue) => issue.level === "error");
    const warnings = issues.filter((issue) => issue.level === "warning");
    const info = issues.filter((issue) => issue.level === "info");

    elements.errorCount.textContent = String(errors.length);
    elements.warningCount.textContent = String(warnings.length);
    elements.infoCount.textContent = String(info.length);

    if (!issues.length) {
      const item = document.createElement("div");
      item.className = "schema-issue schema-issue-info";
      item.textContent = "No local implementation issues detected.";
      elements.issueList.appendChild(item);
      return;
    }

    issues.forEach((issue) => {
      const item = document.createElement("div");
      item.className = `schema-issue schema-issue-${issue.level}`;
      item.textContent = issue.message;
      elements.issueList.appendChild(item);
    });
  }

  function validateEditedOutput({ announce = true } = {}) {
    const text = elements.jsonOutput.value.trim();
    const issues = [];

    if (!text) {
      notify("The JSON-LD editor is empty.", "error");
      return false;
    }

    let parsed;

    try {
      parsed = JSON.parse(text);
    } catch (error) {
      issues.push({
        level: "error",
        message: `Invalid JSON syntax: ${error.message}`,
      });
      renderIssues(issues);
      elements.issueStat.textContent = "1";
      if (announce) notify("JSON-LD contains invalid JSON syntax.", "error");
      return false;
    }

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      issues.push({
        level: "error",
        message: "The JSON-LD root must be a JSON object.",
      });
    }

    if (parsed && typeof parsed === "object") {
      if (!parsed["@context"]) {
        issues.push({
          level: "warning",
          message: 'JSON-LD has no "@context" property.',
        });
      }

      if (!parsed["@type"] && !Array.isArray(parsed["@graph"])) {
        issues.push({
          level: "warning",
          message: 'JSON-LD has neither a root "@type" nor an "@graph" collection.',
        });
      }

      if (
        parsed["@context"] &&
        parsed["@context"] !== "https://schema.org" &&
        parsed["@context"] !== "http://schema.org"
      ) {
        issues.push({
          level: "info",
          message:
            'The "@context" is not the standard Schema.org context used by this generator.',
        });
      }
    }

    issues.push({
      level: "info",
      message:
        "JSON syntax validation does not verify every Schema.org range/domain rule or Google feature requirement.",
    });

    state.currentIssues = issues;
    renderIssues(issues);
    elements.issueStat.textContent = String(
      issues.filter((issue) => issue.level !== "info").length,
    );
    elements.sizeStat.textContent = formatBytes(utf8Size(text));

    if (announce) {
      if (issues.some((issue) => issue.level === "error")) {
        notify("JSON-LD validation found errors.", "error");
      } else {
        showActionSuccess("JSON-LD syntax validated successfully.");
      }
    }

    return !issues.some((issue) => issue.level === "error");
  }

  function safeScriptJson(jsonText) {
    return jsonText
      .replace(/</g, "\\u003C")
      .replace(/\u2028/g, "\\u2028")
      .replace(/\u2029/g, "\\u2029");
  }

  async function copyText(text, successMessage) {
    if (!text) {
      notify("There is nothing to copy.", "error");
      return;
    }

    try {
      if (typeof window.xavertCopyText === "function") {
        await window.xavertCopyText(text);
        return;
      }

      await navigator.clipboard.writeText(text);
      showCopySuccess(successMessage);
    } catch {
      notify("Clipboard access failed.", "error");
    }
  }

  function downloadText(filename, text, mimeType) {
    if (typeof window.downloadFile === "function") {
      window.downloadFile(filename, text, mimeType);
      return;
    }

    const blob = new Blob([text], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.hidden = true;
    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    showDownloadSuccess(`${filename} download started.`);
  }

  function schemaLabel(schema) {
    const type = Array.isArray(schema["@type"])
      ? schema["@type"].join(", ")
      : schema["@type"] || "Thing";

    const name =
      schema.name ||
      schema.headline ||
      schema.alternateName ||
      schema["@id"] ||
      "Unnamed entity";

    return { type: String(type), name: String(name) };
  }

  function stripContext(schema) {
    const clone = JSON.parse(JSON.stringify(schema));
    delete clone["@context"];
    return clone;
  }

  function addCurrentToGraph() {
    if (!state.currentSchema || state.outputMode !== "current") {
      notify(
        "Show or generate a current schema before adding an entity to @graph.",
        "error",
      );
      return;
    }

    if (!validateEditedOutput({ announce: false })) {
      notify("Fix JSON syntax before adding the entity to @graph.", "error");
      return;
    }

    let edited;

    try {
      edited = JSON.parse(elements.jsonOutput.value);
    } catch {
      notify("The JSON-LD editor contains invalid JSON.", "error");
      return;
    }

    if (Array.isArray(edited?.["@graph"])) {
      notify(
        "The editor currently contains an @graph collection. Show Current before adding a single entity.",
        "error",
      );
      return;
    }

    const node = stripContext(edited);
    const signature = JSON.stringify(node);

    if (state.graphNodes.some((item) => JSON.stringify(item) === signature)) {
      notify("This exact entity is already in the @graph collection.", "info");
      return;
    }

    state.graphNodes.push(node);
    renderGraph();
    elements.graphStat.textContent = String(state.graphNodes.length);
    showActionSuccess("Entity added to @graph.");
  }

  function renderGraph() {
    elements.graphList.replaceChildren();

    if (!state.graphNodes.length) {
      const empty = document.createElement("p");
      empty.className = "schema-empty";
      empty.textContent = "No graph entities added yet.";
      elements.graphList.appendChild(empty);
    } else {
      state.graphNodes.forEach((node, index) => {
        const item = document.createElement("div");
        item.className = "schema-graph-item";

        const copy = document.createElement("div");
        copy.className = "schema-graph-copy";

        const label = schemaLabel(node);

        const type = document.createElement("span");
        type.className = "schema-graph-type";
        type.textContent = label.type;

        const name = document.createElement("span");
        name.className = "schema-graph-name";
        name.textContent = label.name;

        copy.append(type, name);

        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "btn btn-secondary schema-remove-btn";
        remove.textContent = "×";
        remove.title = "Remove graph entity";
        remove.setAttribute("aria-label", `Remove graph entity ${index + 1}`);
        remove.addEventListener("click", () => {
          state.graphNodes.splice(index, 1);
          renderGraph();

          if (state.outputMode === "graph") {
            showGraphOutput();
          }

          elements.graphStat.textContent = String(state.graphNodes.length);
        });

        item.append(copy, remove);
        elements.graphList.appendChild(item);
      });
    }

    const hasGraph = state.graphNodes.length > 0;
    elements.useGraphBtn.disabled = !hasGraph;
    elements.clearGraphBtn.disabled = !hasGraph;
  }

  function showGraphOutput() {
    if (!state.graphNodes.length) {
      notify("Add at least one entity to @graph first.", "error");
      return;
    }

    const graph = {
      "@context": "https://schema.org",
      "@graph": state.graphNodes,
    };

    state.outputMode = "graph";
    elements.jsonOutput.value = JSON.stringify(graph, null, 2);
    elements.outputModeBadge.textContent = "@graph collection";
    elements.typeStat.textContent = "@graph";
    renderResultStats(graph, state.currentIssues);
    validateEditedOutput({ announce: false });
  }

  function showCurrentOutput() {
    if (!state.currentSchema) {
      notify("Generate a schema first.", "error");
      return;
    }

    state.outputMode = "current";
    elements.jsonOutput.value = JSON.stringify(state.currentSchema, null, 2);
    elements.outputModeBadge.textContent = "Current schema";
    state.currentIssues = state.guidedIssues;
    renderResultStats(state.currentSchema, state.guidedIssues);
    renderIssues(state.guidedIssues);
  }

  function clearGraph() {
    state.graphNodes = [];
    renderGraph();
    elements.graphStat.textContent = "0";

    if (state.outputMode === "graph") {
      showCurrentOutput();
    }
  }

  function clearTool() {
    state.currentSchema = null;
    state.currentIssues = [];
    state.guidedIssues = [];
    state.graphNodes = [];
    state.outputMode = "current";
    state.customRowId = 0;

    elements.schemaType.value = "Article";
    elements.resultSection.hidden = true;
    elements.jsonOutput.value = "";
    elements.outputModeBadge.textContent = "Current schema";
    elements.typeStat.textContent = "—";
    elements.propertyStat.textContent = "0";
    elements.nestedStat.textContent = "0";
    elements.graphStat.textContent = "0";
    elements.issueStat.textContent = "0";
    elements.sizeStat.textContent = "0 B";
    elements.errorCount.textContent = "0";
    elements.warningCount.textContent = "0";
    elements.infoCount.textContent = "0";
    elements.issueList.replaceChildren();
    clearInlineMessage();

    renderType();
    renderGraph();
    elements.schemaType.focus();
  }

  function invalidateGeneratedResult() {
    if (!elements.resultSection.hidden) {
      state.currentSchema = null;
      state.currentIssues = [];
      elements.resultSection.hidden = true;
      elements.jsonOutput.value = "";
    }

    if (
      elements.message.classList.contains("message-success") ||
      elements.message.classList.contains("success")
    ) {
      clearInlineMessage();
    }
  }

  function clearInlineMessage() {
    elements.message.textContent = "";
    elements.message.classList.remove(
      "message-success",
      "message-error",
      "message-info",
    );
  }

  function notify(text, type = "info") {
    if (typeof window.showMessage === "function") {
      window.showMessage(text, type);
      return;
    }

    clearInlineMessage();
    elements.message.textContent = text;
    elements.message.classList.add(`message-${type}`);
  }

  function showActionSuccess(text) {
    if (typeof window.showActionSuccess === "function") {
      window.showActionSuccess(text);
    } else {
      notify(text, "success");
    }
  }

  function showCopySuccess(text) {
    if (typeof window.showCopySuccess === "function") {
      window.showCopySuccess(text);
    } else {
      notify(text, "success");
    }
  }

  function showDownloadSuccess(text) {
    if (typeof window.showDownloadSuccess === "function") {
      window.showDownloadSuccess(text);
    } else {
      notify(text, "success");
    }
  }


  elements.schemaType.addEventListener("change", renderType);

  elements.addCustomPropertyBtn.addEventListener("click", () => {
    createCustomRow();
    invalidateGeneratedResult();
  });

  elements.generateBtn.addEventListener("click", () => {
    generateSchema();
  });

  elements.clearBtn.addEventListener("click", clearTool);

  elements.validateBtn.addEventListener("click", () => {
    validateEditedOutput();
  });

  elements.jsonOutput.addEventListener("input", () => {
    elements.sizeStat.textContent = formatBytes(
      utf8Size(elements.jsonOutput.value),
    );
  });

  elements.copyJsonBtn.addEventListener("click", () => {
    if (!validateEditedOutput({ announce: false })) {
      notify("Fix JSON syntax before copying.", "error");
      return;
    }

    void copyText(elements.jsonOutput.value, "JSON-LD copied.");
  });

  elements.copyScriptBtn.addEventListener("click", () => {
    if (!validateEditedOutput({ announce: false })) {
      notify("Fix JSON syntax before copying the script tag.", "error");
      return;
    }

    const safeJson = safeScriptJson(elements.jsonOutput.value);
    const script =
      `<script type="application/ld+json">\n${safeJson}\n</script>`;

    void copyText(script, "JSON-LD script tag copied.");
  });

  elements.downloadJsonBtn.addEventListener("click", () => {
    if (!validateEditedOutput({ announce: false })) {
      notify("Fix JSON syntax before downloading.", "error");
      return;
    }

    downloadText(
      "schema-markup.jsonld",
      elements.jsonOutput.value,
      "application/ld+json;charset=utf-8",
    );
  });

  elements.addGraphBtn.addEventListener("click", addCurrentToGraph);
  elements.useGraphBtn.addEventListener("click", showGraphOutput);
  elements.useCurrentBtn.addEventListener("click", showCurrentOutput);
  elements.clearGraphBtn.addEventListener("click", clearGraph);

  renderType();
  renderGraph();
});
