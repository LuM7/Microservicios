import requests
from behave import given, when, then

# URL base de la API
base_url = 'http://localhost:3000'

# Datos para la prueba
usuario_nuevo = {
    "nombre": "Cristian",
    "contrasena": "452489",
    "email": "cris@gmail.com"
}

# Paso 1: Verificar que la API esté en funcionamiento
@given('que la API está en funcionamiento')
def step_given_que_la_api_esta_en_funcionamiento(context):
    context.base_url = base_url

# Paso 2: Enviar una solicitud POST a "/usuarios" con los datos proporcionados
@when('se envía una solicitud POST a "/usuarios" con los siguientes datos')
def step_when_se_envia_una_solicitud_post_a_usuarios(context):
    response = requests.post(f"{context.base_url}/usuarios", json=usuario_nuevo)
    context.response = response

# Paso 3: Verificar el código de estado de la respuesta
@then('la respuesta debe tener un código de estado {expected_status_code:d}')
def step_then_la_respuesta_debe_tener_un_codigo_de_estado(context, expected_status_code):
    assert context.response.status_code == expected_status_code, f"Se esperaba el código {expected_status_code}, pero se obtuvo {context.response.status_code}"

# Paso 4: Verificar el mensaje en la respuesta
@then('la respuesta debe contener el mensaje "{expected_message}"')
def step_and_la_respuesta_debe_contener_el_mensaje(context, expected_message):
    data = context.response.json()
    assert expected_message in data['message'], f"El mensaje esperado '{expected_message}' no se encuentra en la respuesta: {data['message']}"
