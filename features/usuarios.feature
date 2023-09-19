Feature: Creación de un usuario en la API

  Scenario: Crear un nuevo usuario con éxito
    Given que la API está en funcionamiento
    When se envía una solicitud POST a "/usuarios" con los siguientes datos:
      | nombre     | contrasena | email             |
      | NuevoUser  | Password123| usuario@example.com|
    Then la respuesta debe tener un código de estado 200
    And la respuesta debe contener el mensaje "Usuario agregado con éxito"
