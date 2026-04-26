# **ARQUITECTURA INSTRUCCIONAL Y TÉCNICA: PREGUNTAS DE MATEMÁTICAS (SABER 11\)**

Este documento define los estándares pedagógicos, psicométricos y de ingeniería de software para el modelado, generación y evaluación de ítems de Matemáticas dentro del simulador adaptativo Saber 11\.

## **1\. ANÁLISIS DEL ÁREA DE MATEMÁTICAS EN SABER 11**

En la prueba Saber 11, las matemáticas no se evalúan como un fin algorítmico, sino como una herramienta para el **Razonamiento Cuantitativo**.

* **El paradigma del ICFES:** Se aleja de la pregunta tradicional "Despeja ![][image1] en la ecuación ![][image2]". En su lugar, el ICFES pregunta: *"Si un plan de telefonía cobra un cargo fijo de $5 y $2 por cada minuto, ¿qué gráfica representa el costo total de la factura?"*.  
* **Tipos de contexto:** Toda pregunta debe estar enmarcada en una de cuatro categorías: **Familiar/Personal** (finanzas del hogar, compras), **Laboral/Ocupacional** (presupuestos, inventarios), **Comunitario/Social** (demografía, políticas públicas, encuestas) o **Matemático/Científico** (geometría abstracta, ciencias físicas).  
* **Uso del mundo real:** La prueba asume que el estudiante es un ciudadano que debe interpretar contratos, facturas, tasas de interés, noticias con gráficos estadísticos y planos espaciales.

## **2\. COMPETENCIAS MATEMÁTICAS A EVALUAR**

La aplicación debe clasificar estrictamente cada pregunta en una de las tres competencias oficiales del ICFES:

### **A. Interpretación y Representación**

* **Qué evalúa:** La capacidad de comprender y transformar información cuantitativa y esquemática presentada en distintos formatos (tablas, gráficos de barras, diagramas, texto).  
* **Cómo se evidencia:** "A partir de la gráfica, ¿cuál fue el mes con mayor crecimiento relativo?" o "Selecciona la tabla que corresponde a este diagrama de pastel".  
* **Errores comunes (Distractores):** Leer el eje equivocado (![][image3] por ![][image4]), confundir valores absolutos con porcentajes, no advertir la escala del gráfico.

### **B. Formulación y Ejecución**

* **Qué evalúa:** La capacidad de modelar situaciones, diseñar estrategias y ejecutar cálculos o procedimientos matemáticos para resolver un problema.  
* **Cómo se evidencia:** "¿Cuál es el costo total del proyecto si se aplican los descuentos?" o "¿Qué modelo matemático permite calcular la población en el año ![][image5]?".  
* **Errores comunes (Distractores):** Errores aritméticos comunes (ej. sumar denominadores en fracciones), aplicar una fórmula incorrecta (perímetro en vez de área), o resolver un paso intermedio pero no la pregunta final.

### **C. Argumentación**

* **Qué evalúa:** La capacidad de validar, refutar o justificar afirmaciones, hipótesis o procedimientos matemáticos.  
* **Cómo se evidencia:** Un estudiante hizo el procedimiento X para hallar la respuesta. ¿Es correcto el procedimiento? / "La afirmación del gerente es FALSA, porque..."  
* **Errores comunes (Distractores):** Justificaciones con razonamientos circulares, premisas verdaderas que no concluyen lo solicitado, o aplicar excepciones como si fueran reglas generales.

## **3\. COMPONENTES O EJES MATEMÁTICOS**

La base de datos (Question Bank) debe catalogar las preguntas en tres grandes componentes:

1. **Numérico \- Variacional:**  
   * *Conceptos:* Proporcionalidad (regla de tres), porcentajes, tasas de interés, funciones lineales, cuadráticas y exponenciales, sucesiones, inecuaciones.  
   * *Situaciones:* Crecimiento de poblaciones, finanzas personales, conversión de divisas, escalas.  
   * *Recurso visual:* Planos cartesianos, secuencias.  
2. **Geométrico \- Métrico:**  
   * *Conceptos:* Áreas, volúmenes, teorema de Pitágoras, semejanza y congruencia de triángulos, trigonometría básica, transformaciones isométricas.  
   * *Situaciones:* Diseño de empaques, planos arquitectónicos, trayectorias espaciales, optimización de materiales.  
   * *Recurso visual:* Figuras geométricas 2D/3D, diagramas espaciales.  
3. **Aleatorio (Estadística y Probabilidad):**  
   * *Conceptos:* Medidas de tendencia central (promedio, moda, mediana), dispersión, probabilidad clásica, conteo (permutaciones/combinaciones).  
   * *Situaciones:* Resultados de encuestas, control de calidad, juegos de azar, censos poblacionales.  
   * *Recurso visual:* Histogramas, gráficos circulares, diagramas de caja y bigotes, tablas de frecuencias.

## **4\. TIPOLOGÍA DE PREGUNTAS Y ESTRUCTURA DEL ÍTEM**

Para evitar la previsibilidad, la plataforma debe soportar al menos 4 tipos estructurales de ítems:

| Tipo de Pregunta | Estructura | Distractores | Dificultad sugerida |
| :---- | :---- | :---- | :---- |
| **Tabular / Gráfica** | Contexto \+ Gráfica generada via Chart.js \+ Enunciado | Errores de lectura visual (ej. leer el eje inverso). | Fácil \- Media (TRI: ![][image6] de \-1.0 a 0.5) |
| **Modelado Algebraico** | Historia de contexto \+ Solicitud de la ecuación o fórmula que lo resuelve | Fórmulas con signos invertidos o variables mal asignadas. | Media \- Alta (TRI: ![][image6] de 0.0 a 1.5) |
| **Justificación de Procedimientos** | Situación \+ Resolución por parte de un "tercero" \+ ¿Es válido? | Afirma que es válido por una razón irrelevante, o lo invalida usando una premisa falsa. | Alta (TRI: ![][image6] de 1.0 a 2.5) |
| **Probabilidad Condicional** | Tabla de doble entrada \+ Extracción de evento | El distractor usa el total de la muestra en lugar del total del subgrupo condicionado. | Alta (TRI: ![][image6] de 1.5 a 3.0) |

## **5\. DISEÑO TÉCNICO PARA SOFTWARE (MODELO DE DATOS)**

Alineado a tu microservicio **Question Bank**, esta es la estructura recomendada para Matemáticas. Debe soportar LaTeX ($$...$$) y recursos programáticos.

### **Esquema JSON Propuesto**

{  
  "item\_id": "MATH-2026-0841",  
  "subject": "Matemáticas",  
  "competency": "Formulación y ejecución",  
  "component": "Numérico \- Variacional",  
  "context\_type": "Laboral/Ocupacional",  
  "difficulty\_irt": {  
    "a\_discrimination": 1.25,  
    "b\_difficulty": 0.45,  
    "c\_guessing": 0.20  
  },  
  "context\_text": "Una empresa de envíos cobra una tarifa base de $5,000 y un costo adicional de $1,200 por cada kilogramo de peso del paquete. Para fidelizar clientes, ofrece un descuento del 10% sobre el valor \*\*total\*\* a paquetes que superen los 10 kg.",  
  "visual\_resource": {  
    "type": "none",   
    "config": null  
  },  
  "stem": "Si un cliente envía un paquete de $x$ kilogramos ($x \> 10$), ¿cuál de las siguientes expresiones representa el costo final $C(x)$ que debe pagar?",  
  "options": \[  
    {  
      "id": "A",  
      "text": "$$C(x) \= 0.9(5000 \+ 1200x)$$",  
      "is\_correct": true,  
      "feedback": "Correcto. El costo total inicial es $(5000 \+ 1200x)$. Al aplicar el 10% de descuento sobre todo el valor, el cliente paga el 90% restante, es decir, se multiplica todo por 0.9."  
    },  
    {  
      "id": "B",  
      "text": "$$C(x) \= 5000 \+ 0.9(1200x)$$",  
      "is\_correct": false,  
      "feedback": "Este modelo aplica el descuento únicamente al costo por kilogramo, omitiendo descontar la tarifa base, lo cual contradice el enunciado."  
    },  
    {  
      "id": "C",  
      "text": "$$C(x) \= 0.1(5000 \+ 1200x)$$",  
      "is\_correct": false,  
      "feedback": "Esta expresión calcula únicamente el valor del descuento (el 10%), no el costo final que debe pagar el cliente."  
    },  
    {  
      "id": "D",  
      "text": "$$C(x) \= (5000 \+ 1200x) \- 10$$",  
      "is\_correct": false,  
      "feedback": "Este error asume que un descuento del 10% equivale a restar aritméticamente 10 unidades al costo total, confundiendo porcentajes con valores absolutos."  
    }  
  \],  
  "metadata": {  
    "estimated\_time\_sec": 90,  
    "cognitive\_level": "Aplicación",  
    "tags": \["Funciones lineales", "Porcentajes", "Modelado"\]  
  }  
}

## **6\. USO DE RECURSOS VISUALES Y DATOS (LATEX Y PROGRAMMATIC)**

Tal como define la estrategia de imágenes:

1. **Fórmulas:** NUNCA usar imágenes para ecuaciones. Todo debe ser inyectado como texto plano utilizando MathJax o KaTeX en el frontend (ej. $$\\frac{a^2 \+ b^2}{c}$$).  
2. **Gráficos Estadísticos:** Usar Chart.js renderizado dinámicamente desde un JSON de datos. Esto permite escalabilidad, modo oscuro, y previene la pixelación de imágenes, además de hacer que la IA los genere sin alucinaciones.  
3. **Figuras Geométricas:** Usar esquemas SVG incrustados.

## **7\. GENERACIÓN AUTOMÁTICA CON INTELIGENCIA ARTIFICIAL (PROMPTS)**

Para el servicio **AI Generator Service**, las matemáticas requieren técnica de **Chain of Thought (CoT)** para evitar que la IA invente cálculos incorrectos.

**Directrices para el System Prompt (Claude 3.5 Sonnet / GPT-4o):**

1. **Restricción de contexto:** "Crea una situación basada en Colombia (comercio local, DANE, transporte público)."  
2. **Validación Matemática (CoT):** "Antes de generar las opciones, resuelve matemáticamente el problema paso a paso en un bloque \<scratchpad\>. Solo después de estar 100% seguro del resultado numérico, genera la opción correcta."  
3. **Matriz de Errores:** "Para los 3 distractores, simula ser un estudiante que comete errores específicos: Distractor 1: Falla en jerarquía de operaciones. Distractor 2: Falla al interpretar el gráfico. Distractor 3: Responde algo verdadero pero que no es lo que pide la pregunta."  
4. **Formateo:** "Las ecuaciones DEBEN usar notación LaTeX encerrada en $$ para bloques y $ para formato en línea."

## **8\. PLAN DE TRABAJO (Diseño y Desarrollo Matemáticas)**

Integrable con los Sprints definidos en tu plan de trabajo:

* **Fase 1 (Sprints 1-2): Infraestructura Matemática.** Configurar KaTeX/MathJax en el frontend (React) para asegurar la renderización perfecta de fracciones, integrales y raíces. Definir la taxonomía DCE en la base de datos de Question Bank.  
* **Fase 2 (Sprint 3): Prompts y AI.** Desarrollar y testear los prompts de IA con "Chain of Thought". Crear el repositorio de SVGs paramétricos para geometría.  
* **Fase 3 (Sprints 4-5): Calibración TRI.** Cargar preguntas semilla y asignarles niveles de dificultad a priori (![][image7] params) para alimentar el Motor CAT (Computerized Adaptive Testing).  
* **Fase 4 (Sprint 6-7): Analytics.** Construir el tablero docente donde se identifique si los estudiantes están fallando en "Razonamiento" o en "Ejecución algorítmica".

## **9\. BONUS: DIAGNÓSTICO ADAPTATIVO Y RUTAS**

1. **Diagnóstico Inicial (CAT):** Inicia la prueba con una pregunta de dificultad ![][image8] (Nivel medio). Si el estudiante acierta, lanza una de ![][image9]. Si falla repetidamente en Componente Numérico, el algoritmo no solo baja la dificultad, sino que etiqueta esa debilidad.  
2. **Sistema de Errores Frecuentes:** Analiza qué distractores escoge el usuario. Si el usuario siempre escoge el "Distractor de lectura de eje incorrecto", el **Study Planner Service** le asignará de inmediato una micro-cápsula llamada *"Aprende a leer gráficos cartesianos"*.  
3. **Dashboards:** El docente no solo verá "40% de aciertos", sino un reporte que indique: *"El 60% de la clase no domina Proporcionalidad; fallan consistentemente en diferenciar correlación directa de la inversa"*.

[image1]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAsAAAAYCAYAAAAs7gcTAAAA+0lEQVR4XmNgGAX0BsxycnLGioqKbuLi4txAPqOSkpIaUMxVRkaGE64KKMgvLy+/DIiLgLgaiC8qKChMANKtQDwXiNcD+RwgtYxATousrKwtiANkSwLxQyBeDrRFD0i/BeIDoqKiPAxAK4SAnBqYTqACfSD/ExBHGxsbswKdEQvEWnBnIAOQIiD+CnI/uhw6YAQqmg9UfBpIC6JLwjw3GSiZJiUlJQJkXwVpAGkEyYNCAyQHVgyU9ATi/0DcC8SOQPwbKFkOMwjol4VAf6mAFQMllIAKzgHxUqDERiAuALJvy0OCbBsQO0EdAQGgkFBWVhYDMpmx8UcBNgAABJY2Qx0L1WMAAAAASUVORK5CYII=>

[image2]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGMAAAAYCAYAAADu3kOXAAAELElEQVR4Xu2YW4hNURjH9wlFyK0xaWb2OjMj0+TeCRHlASWRXKdGroXkweXBvWielMg1TcotuYcHuTY8KLnkQZ6URCQPKCHSGL9v1tp71lnOMXvOzByj9r/+7bO+9V9rfev79rrs43kxYsSIESNGC6GUGgC3wdpkMrmjuLh4oKvpSPB9fy6+jisoKOhBMVFeXt4f2wJ8H+Fq84mkRlUGe1f8W1hSUjJEfmPqVFRUVIxtuTQIhaWlpaOZ2C2EE/g9nN9XYQNcT3UiFHYcdMa3c8ZHm+fLysp6ueL2BuNWwlWwDtYT2+OuBltvAv8gg8+7UqlUl0YRK6AbossYl1LsJDYy1o/GD7F9pS5ld9qWYIw1jDHVtUcB7Y7AZ/j3mucFOM0z/ucbjF3JXGbyHAffZEqGrGClX/Jn8AV+H0M3xrNfdqW3p1fws6wKy75Z6cytC8VtDBzaAKe79ijAr/3t+aLkgiCW2ZIhdtG4dSFkiSDay8Ru2EIJlCRDnrZeVo0EkO1gEMVEYWFhd5I4JZczJk5GNMieLEtf9r+JgdEsxdOwGt6DhwjIGZ6r4UtbGwWtTMYB2u7h+QS+gffhSFeXT0RIxlnqdyu9Vb2lfAUmXW0aZC9D/BXWBocLEx8sAbDKsnJ+wLFwH2zgAjAjvae/ozXJoN1R/NzkmXOC8gJ8+CiXEUeaBjTb0L5uAa+z6vu6/WRCc8mgrxvUzff0OZFAW0P5OT4rV98IuY0gug1PyhYU2Olonty2grLSB+gj7H1ky6LTRXIZCOptSAIZsNA4a7OG9gtdu1xTvWYO44qKip6epZFrotIr5DTFzk3K/MH4nzEZIGF8Dg9s4jkK/Tf025tkBhI0gnMYwe5sgRVIAkwijnoRrr5K3zJqM/Axjtx07dj2Nrt8HQSBgC8k8W59PhD4kCUZf4D4pZTegW7bL36YCHvpI6qUwzkUGVidVLt1LYGf4zaFj0sY+xfPlYHNSoYw6yFprpjuCs3KKKs0QOBDpmRg20ndT+Y7ObBZcbxrPl4bIfvXehqsld+BkfIK7LPktyRF6Q+tAcYefoOYb5U9xvHIyDUZ0o7xG+xkWNtU2sRc4OtQ2s+JSvqb+rddwkYzyZCbVL1vJSPYpnxrh0kgXCxGmYxvHV6UP/IcL0tI6XPkPUkZxvOSDCqDSwc8Z8OtQYdR4eeYDKUvDeFlQsAc5mP7Lr7Y2nxC4mHicspzYoF/VXCjZZe4b0L7qTS4dFgdNGTgO4JVZhpup1zn66/1LfCaoVx196XteRGRazI8s5LhHbhMxocf4Cqpc8XtDeYwSelVWa+aYveFmD2VlSgaeXGwHYQXsS/iecL4nNM/EAn54LO2ALfcYrQiGY1gWyxhYjNlC/0X/0nlgITcPJnzHPyemNR/GHYMKH3LqnTtMWLEiBEjRowY/w1+A3YOYluRGUQMAAAAAElFTkSuQmCC>

[image3]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAAXCAYAAAAGAx/kAAABHUlEQVR4XmNgGAUkATk5OS15efk7QPwfCX+TlZW1BckD2ZPR5O4rKSmpoZsDB0AFlkD8E4hvA7EkTFxFRYUdyF8PtLBeXFycG1kPViAjI8MJVLwDqOmfgoKCB1SYEcgvBWEQG1k9XgA0IALq/OXGxsasUEO6QWx0tXiBoqKiOFDjdSB+D8TNQDyZZENgAKi5FeQqoOsOAQOVH12eaAA0xAsUTkB8gmyDgJo1gXgf0DW3QIYhBTpxAGQzUOMqYBiZgfjIYQVMTzro6rECqCHrgNgbWRzomgZoWDUgi2MFQIWKQIUbgbgQXQ6YpmyA8r+BcqekpaWF0eXBAKgoFqjoF8hGKP4L1OAPkwfys0BiyPJAPTuBiVYI2ZxRMKIBANPJUNHE8/bwAAAAAElFTkSuQmCC>

[image4]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAXCAYAAAAC9s/ZAAABAklEQVR4XmNgGAUMsrKyfvLy8l+A+D8MKygo3FJSUlKDqZGRkRECip9AUvMXqCYe2RwGoGAOVHINkMuCIskAtkgHKHcGiJ2AXEZ0eQY5OTkloORzIH4CxIrIckDX8APFVikqKpohi6MDFqCi5VBXRMMExcXFuYH8OUAcjKwYKwD6KwLZG8bGxqxAl80A4jIGbM5GByCnQ73wFqhJG0iXAuk6kEHoanEBRqCG+SBXAOmDQHoyKZrBABqtoKg8BAo8dHmCAKh5EhB/Axpkii5HEACdLQjUfBqIr0pJSYmgyxMEQAOMgZq/AvFSBmJCHQaAGl2Amp6B/I6EX4HE0dWOgmEJAAC9QvRNcyAcAAAAAElFTkSuQmCC>

[image5]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAXCAYAAAA/ZK6/AAAA+UlEQVR4XmNgGAWDBqioqPDJy8t7Kisry4L4xsbGrLKysiZycnK+ioqK4iiKRUVFeRQUFGYCcSNQ0xOgolggvRlIpwHpaiD+CGS7wDUAFXoAcTpQ0Bgo+RWI9ygpKfGD5IBsSSB+CJQrh2sAclKBgppAHATEv4HYESYHFX8LxEVwDSCgrq7OCxQ8DMRrgFwWqDALkL8ciE/AbIQDbCYB2YpA/ATo3AYZGRlOoEvapaWlhWGSYOcABW1gGkAhBBT7BgwtUyDbFciugsmBPN4AFLgINwGiQQkodgeItwPxMhRnATVwgIIXLgAFoPiQkpISATKZ0eVGAT4AAGJBNb/ZxGbqAAAAAElFTkSuQmCC>

[image6]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAWCAYAAAD9091gAAABDklEQVR4XmNgGBDAqKSkpKaoqOgmLi7OjSIjIyPDKScnN11eXn4OkM4F0sfhksbGxqxAgVlAifkgtoKCAgeQvxWuACgQDhR4KSsrqwMVYgTyl4JZ0tLSwkAFp4ACy4FcFpCYqKgoD5B/AKY7Asj5B6KhuhmAfEkgfghis4B0AvFzoP1KMAVAq0yBYt8YgN4RBzLuAvEvoIJHMAzkfwHi/4QVADnGQMZXIJ4EMx5q7RogfgtS4AtSCcTRMFkgWxGIn8iDfAVV8A3kKJgCqK9AYrYgBTZAzkuQVSBJaHDvAAU5yCqYI8+AFDJAQi8HiHcDI4wfZiLIzmAgvgh12FagFRJwSRgABS1QQgBdnA4AAHHBTC8PB0fNAAAAAElFTkSuQmCC>

[image7]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACwAAAAYCAYAAACBbx+6AAACv0lEQVR4Xu2VPWhUQRDH3xEFvxX0PHNfe194BESLqwSxkChY+FkJgogWNmkMqIggNpImNtqFWFgJGrRSUYMGbNIKAUERLESrNIJgEI2/P2837m3u4kvw4Ir7w5/3dmZ2ZnZm9r0o6qGHzqNUKq0pl8uZRqOxOtR1FfL5fM0YMwPn4ddisVgJbboOqi7JPoFT6XR6Q6jvOlDlHMl+gjdDXVeCMRgk2V+FQuFoqOsE+gg2wIU5lMlk1ofKJCDhK5pffOyWH9b7EPeFdkmgi8v+Izz3L7rAlUplJ4GmMRiBZzSD8AscbjJcAt78zsHX8DSyezyf4X9zaN8O7NnBngn4mPdT5HOd54sFH5zAIHgPr7JMSaZgcH45rfXmd9I5J1iD9bekfpSLib80Y6qq/PA+DWfhgGxW8TIOP8Oy28j7sG+UBGo/9nN+cjbh7xoV37YNWuUi2TmKeTxSMZWQTWxCSs9ILVnWp8nOb9Mhje2USTBabXJphoZaDjnBBSfTsCP7CG/7tv+Cndc39Xp9o5PJh4lneq9v2woulyUP5xkd9mRq7U94UoFI5KJV9VWr1e26XM7WhxIW3doe/B184G65OpbL5bZG9q74UA7KRTmFumw2uy7S14Z524XRrJs7O+STJp47zd81noPS8X7eHu5+1KJlJHvD/G1nin2XlbAukvRKlPVb06biFKOA/AN+zvpyZAfgI3vQKMViyDq6C1/CE3CGgM953nLVsd34YeJx6fedCjjMI39l4vl/CqcIXnJ6VdfKf8NL3tYFmLjKunQP4Zh8EHekVqttajKUM7U7sh95JUkbtrm1g8YBJ3fUbl/uIaVKYLclVDioY/gYCuUOii3/fj4rBoH0oRyNWoxEUthRWTQSnYB+3aMEPBgqkoLK7cHHOD+ZtaHuv4NA/bT6WNTihieF7oFmPZT30MMK8QcxNbhPx2FdgAAAAABJRU5ErkJggg==>

[image8]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADsAAAAYCAYAAABEHYUrAAAC2ElEQVR4Xu2WO2gUQRjH94iCgq+oh3iP3bvj8Eh9oAixszBIVNRCsbDygQQEi6SyCsE+hYX4wEJESatYKrEQkiaFDwTxgSAKlimiRP39czPL3CQbF0lWCPuHPzvzzTc73//bb2Y2CHLkWFMolMvlHbVabZs/sKYQRdFV+AP+hmP+eMYokPB9xDEOr8PD2Hp8p6XQbDa3hGF4mTk3jKbdvs8CcDrI4Hy1Wj3ij2WIAnEMw2fEUlel8byn4Nvt9nrf2UW9XsctmmHuOZK1gfYAz7fY9/q+EjuCwxeeDX8sK7B2mxi+8ux3bA1sHwn8kOvrYR0+N+GE2tZIf4z5TyqVysbY02TiEXxaLBY3xQMZQ8FJWOSUX6vV2kx/kqDv0C047jFMQvShRlw7tuNwVkmMjSgvY/yA8Vqj0diD+GPuglnASXiXWCVfHwFOEV+vO8fCbMFfvlj6g1HnHDrjGheczUKjLHxR9a7MOHNXFY6oJLFddhdWVJLYLrs6GOfhCWtD7F0tklTWjJ9m3qe05F3TVFDTf4+FhBhB/yJW8acSq8094QszYhMXWGlwau5irXf+mmnEYr/iixIWibX7FY47Tr30p7S4gohnryKSRCXZXSwSlWQPO8f9bOTsT9p98Du8HzhHuQtzoKj0UlFJ+8tdaSssSeykTmZ3ggUa+hn/mSQ2stokNuzsq/h4ZnAIzvGDcSCe6UGXOHNOpiXJOUoVbfff40LBRp0k91lbqVTaSf9l5FQeN8ZWYisF5ipaqjoF1rzQ9T4adfgmNBe5+RN5TX84SLjXVgs6wFj7M0GesjYlHNs3uF9981c1A+esDRRoj8IXSoQMqiL6DyOvOuV4CU7DWxIKh4KU/6MrjajzI/CeZJ9H9FnarxRfYBJvyvqxrkZ9GDtPIo39Ac8BeBs+JzmV+OUW2oMp9lUm0NdD7KCotj++DHrCzrbU1tG2/C8fLEeOHDlyLIc/vVn0/mnfDXYAAAAASUVORK5CYII=>

[image9]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADsAAAAYCAYAAABEHYUrAAACbElEQVR4Xu2WO2gVQRiF7yUKCuKTq8T7mL0PhNQrghA7mxQaUUHExkYMEhAsTGUVxN5SNMTKB2kVS0ELwTSpFEFQCViJjSlUon5nd3ZZJ67uFNkrYQ8cdubMP48zz63VKlTYUKg3m809QRDsdAs2FIwx1+A3+BNed8uHgVartZWJP+8z+YPBYHun07mMh1vW06gbE4GgoxSuttvt425ZWcDgbsydYSzzjOUzfJ87YAfdbpdQs0TdC7SxhfQE3zfoh9xYmZ0h4CPfnltWFqzZSSb8IOO472F2E3G34YLSiahdSjtPtEvSSDsTj+DTRqOxLS0YIhjT3aJmtUB2oWayOtpJuIIepiLOm4jvEG/0er0DdHSiSCfrCU+zOoI/XLPkj5n4HjqXFaNg2/gsHU1pv2tmMnVLhafZyFSe2d90ZRBX4alEs53lbmvKz1LvQ1HS1iI7aOC2kwdPsxp/IbM63AuuMZ/O1gM+/RNzxTUlrDGbnFd4MxO0i/xL+Jare19au0T4mF1jKk8nESKsmMz5JD0GP8F7tcxVnkUQ3+CjRalJC8Nws9tOHjzNjhP3Pc+sSbzJbCc+V+n1TOE0/Mp7dySt6UCPOHVOFyWDn9Q76raTh7+Z5cXYwdj2k6wr/6fdKdDGRRMv2lgkkOjC1wxoXHn7J/KK/NWabWwYsGaX+V9vZXX9v6MvaTHgYSvXSc/CF5oICdpF5B8aZ3cq8BJchHdkFE6jjyQBZaHf7++l72fwi4m3n6hXYhnzU4rRJUr+cRD/Cpqkrkxa/QHfCTgHn7uTFUFn0Pdc/YcYscdSR0fHsvQFq1ChQoUK/8Iv/bDX5t4PXgkAAAAASUVORK5CYII=>