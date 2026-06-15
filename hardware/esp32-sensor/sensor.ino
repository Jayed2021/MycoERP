/*
 * MycoERP IoT Sensor Firmware
 * ESP32 + DHT22 + MH-Z19B (optional)
 *
 * Reads temperature, humidity, and CO2 levels, then sends
 * them to the MycoERP Supabase Edge Function for logging and alerting.
 *
 * Hardware:
 *   - ESP32 DevKit v1
 *   - DHT22 on GPIO4 (10K pull-up to 3.3V recommended)
 *   - MH-Z19B on Serial2 (GPIO16 RX, GPIO17 TX) - optional
 *   - Status LED on GPIO2
 *
 * Libraries required (install via Arduino Library Manager):
 *   - DHT sensor library (Adafruit)
 *   - Adafruit Unified Sensor
 *   - MH-Z19 by Jonathan Dempsey (if using CO2 sensor)
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>
#include "config.h"

#if ENABLE_CO2
#include <MHZ19.h>
#include <HardwareSerial.h>
MHZ19 mhz19;
HardwareSerial co2Serial(2);
#endif

DHT dht(DHT_PIN, DHT_TYPE);

int readingCount = 0;

void setup() {
  Serial.begin(115200);
  delay(100);

  pinMode(STATUS_LED_PIN, OUTPUT);
  digitalWrite(STATUS_LED_PIN, LOW);

  Serial.println("\n=== MycoERP IoT Sensor ===");
  Serial.print("Device ID: ");
  Serial.println(DEVICE_ID);

  // Initialize DHT22
  dht.begin();
  Serial.println("DHT22 initialized");

  // Initialize MH-Z19B CO2 sensor
  #if ENABLE_CO2
  co2Serial.begin(9600, SERIAL_8N1, CO2_RX_PIN, CO2_TX_PIN);
  mhz19.begin(co2Serial);
  mhz19.autoCalibration(false);
  Serial.println("MH-Z19B initialized (auto-calibration off)");
  #endif

  // Connect to WiFi
  connectWiFi();

  Serial.println("Setup complete. Starting sensor loop...\n");
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  // Blink twice: reading sensors
  blinkLed(2, 100);

  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();
  int co2 = -1;

  #if ENABLE_CO2
  co2 = mhz19.getCO2();
  #endif

  readingCount++;

  // Validate DHT readings
  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("ERROR: Failed to read from DHT22 sensor");
    blinkLed(10, 50); // Rapid blink = error
    delay(5000);
    return;
  }

  // Skip warmup readings (CO2 sensor needs time)
  if (readingCount <= WARMUP_READINGS) {
    Serial.printf("Warmup reading %d/%d - skipping send\n", readingCount, WARMUP_READINGS);
    delay(10000);
    return;
  }

  Serial.printf("Reading #%d: Temp=%.1f°C, Humidity=%.1f%%", readingCount, temperature, humidity);
  #if ENABLE_CO2
  if (co2 > 0) {
    Serial.printf(", CO2=%d ppm", co2);
  }
  #endif
  Serial.println();

  // Send data to edge function
  bool success = sendData(temperature, humidity, co2);

  if (success) {
    blinkLed(3, 200); // Three blinks = success
    Serial.println("Data sent successfully\n");
  } else {
    blinkLed(10, 50); // Rapid blink = error
    Serial.println("ERROR: Failed to send data\n");
  }

  // Wait for next reading
  #if ENABLE_DEEP_SLEEP
  Serial.printf("Entering deep sleep for %d seconds...\n", READING_INTERVAL_MS / 1000);
  esp_sleep_enable_timer_wakeup((uint64_t)READING_INTERVAL_MS * 1000);
  esp_deep_sleep_start();
  #else
  delay(READING_INTERVAL_MS);
  #endif
}

bool sendData(float temperature, float humidity, int co2) {
  HTTPClient http;
  http.begin(EDGE_FUNCTION_URL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(15000);

  String payload = "{";
  payload += "\"device_id\":\"" + String(DEVICE_ID) + "\",";
  payload += "\"api_key\":\"" + String(API_KEY) + "\",";
  payload += "\"temperature\":" + String(temperature, 1) + ",";
  payload += "\"humidity\":" + String(humidity, 1);

  #if ENABLE_CO2
  if (co2 > 0) {
    payload += ",\"co2\":" + String(co2);
  }
  #endif

  payload += "}";

  Serial.print("Sending: ");
  Serial.println(payload);

  int httpCode = http.POST(payload);

  if (httpCode > 0) {
    String response = http.getString();
    Serial.printf("HTTP %d: %s\n", httpCode, response.c_str());
    http.end();
    return httpCode == 200;
  } else {
    Serial.printf("HTTP error: %s\n", http.errorToString(httpCode).c_str());
    http.end();
    return false;
  }
}

void connectWiFi() {
  Serial.printf("Connecting to WiFi: %s", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  // Blink once: connecting
  blinkLed(1, 500);

  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < WIFI_MAX_RETRIES) {
    delay(500);
    Serial.print(".");
    retries++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(" Connected!");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
    // Solid LED for 2 seconds = connected
    digitalWrite(STATUS_LED_PIN, HIGH);
    delay(2000);
    digitalWrite(STATUS_LED_PIN, LOW);
  } else {
    Serial.println(" FAILED!");
    Serial.println("Restarting in 10 seconds...");
    delay(10000);
    ESP.restart();
  }
}

void blinkLed(int times, int delayMs) {
  for (int i = 0; i < times; i++) {
    digitalWrite(STATUS_LED_PIN, HIGH);
    delay(delayMs);
    digitalWrite(STATUS_LED_PIN, LOW);
    if (i < times - 1) delay(delayMs);
  }
}
