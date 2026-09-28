// Ahududu · ESP32 terazi firmware'i
// Donanım: ESP32 dev kit + HX711 + 20 kg çubuk yük hücresi
// Bağlantı (bkz. "Terazi Bench Testi"):
//   Yük hücresi: kırmızı→E+, siyah→E−, beyaz→A−, yeşil→A+
//   HX711: VCC→3V3 (5V DEĞİL), GND→GND, DT→GPIO4, SCK→GPIO5
//
// Kütüphane: Arduino IDE > Library Manager > "HX711" (Bogdan Necula / bogde)
//
// Çıktı: 115200 baud, saniyede ~10 kez tek satır gram değeri, örn. "1032.4"
// Komutlar (Serial'den):  t = dara (sıfırla)   c<gram> = kalibre et, örn. "c1000"
//                         f = mevcut ölçek faktörünü yazdır
//
// Kalibrasyon: boş terazide "t" gönder, sonra bilinen ağırlığı koy (örn. 1000 g),
// "c1000" gönder. Yazdırılan faktörü aşağıdaki SCALE_FACTOR'a yaz ve tekrar yükle.

#include <Arduino.h>
#include "HX711.h"

const int PIN_DT = 4;
const int PIN_SCK = 5;
float SCALE_FACTOR = 420.0f;   // KALİBRASYONDAN SONRA GÜNCELLE
const int SAMPLES = 3;         // her okumada ortalama
const unsigned long PERIOD_MS = 100;

HX711 scale;
unsigned long lastSend = 0;

void setup() {
  Serial.begin(115200);
  scale.begin(PIN_DT, PIN_SCK);
  delay(400);
  scale.set_scale(SCALE_FACTOR);
  scale.tare(20);
  Serial.println("# ahududu-scale hazir");
}

void handleCommand(String cmd) {
  cmd.trim();
  if (cmd == "t") {
    scale.tare(20);
    Serial.println("# dara alindi");
  } else if (cmd.startsWith("c")) {
    float known = cmd.substring(1).toFloat();
    if (known <= 0) { Serial.println("# ornek: c1000"); return; }
    scale.set_scale(1.0f);
    float raw = scale.get_units(20);
    SCALE_FACTOR = raw / known;
    scale.set_scale(SCALE_FACTOR);
    Serial.print("# yeni SCALE_FACTOR = "); Serial.println(SCALE_FACTOR, 4);
  } else if (cmd == "f") {
    Serial.print("# SCALE_FACTOR = "); Serial.println(SCALE_FACTOR, 4);
  }
}

void loop() {
  if (Serial.available()) handleCommand(Serial.readStringUntil('\n'));
  if (millis() - lastSend >= PERIOD_MS && scale.is_ready()) {
    lastSend = millis();
    float g = scale.get_units(SAMPLES);
    if (g < 0 && g > -5) g = 0;   // sıfır etrafındaki gürültü
    Serial.println(g, 1);          // "#" ile başlamayan satırlar = ölçüm
  }
}
