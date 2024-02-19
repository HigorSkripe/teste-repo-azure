# Eticca App - Front-End AngularJS (legacy)

Este projeto é resultado de uma refatoração no serviço do eticca com o objetivo de modernizar a aplicação e consumir menos recursos. Temos um front-end totalmente desacoplado e independente do bakck-end, onde conseguimos termos controle de versões diferentes e publicá-lo na hospedagem que convém.

## Getting Started

Esse projeto foi construído utilizando o Webpack tanto para obter um build otimizado de produção quanto para garantirmos um ambiente de desenvolvimento sensato e que seja produtivo com live reload e tudo que o Webpack nos oferece.

### Pré-requisitos

1. [Yarn][yarn] (>=v1.20.0)
2. [NodeJS][node] (^v14.17.4)

### Instalar Dependências

Com terminal aberto na pasta raíz do projeto execute:

```
yarn
```

Todas as dependências serão baixadas para a pasta `node_modules`.

### Execute a aplicação

Pré-configuramos o projeto com um servidor web de desenvolvimento que o Webpack nos fornece. A maneira mais simples de começar
este servidor é:

```
yarn start
```

Agora navegue até a aplicação em [`localhost:3000`][local-app-url].

### Executando o projeto em ambiente de produção

Está configurado um script de build para gerar toda a aplicação empacotada e otimizada, basta executar:

```
yarn build
```

O resultado deste script será uma pasta `dist` com todo conteúdo necessário para ir em produção, caso queira testar basta entrar nessa pasta com o terminal e executar:

```
npx http-server -p 8080 .
```

Agora navegue até a aplicação em [`localhost:8080`][local-app-prod-url].

<small>* Para saber mais sobre http-server veja em [github/indexzero/http-server][http-server].</small>

## Continuous Integration

### CircleCI

[CircleCI][circleci] é um serviço de integração contínua que configuramos para rodar algumas tarefas sempre que há um novo commit feito push no GitHub.
Ao ser criada uma tag é feito o deploy em produção da aplicação.

## Documentação

Para mais informações sobre AngularJS por favor veja em [angularjs.org][angularjs].

[![xDevel](.github/xdevel.png)](http://xdevel.com.br)

Created and maintained by xDevel® 2021

[angularjs]: https://angularjs.org/
[git]: https://git-scm.com/
[http-server]: https://github.com/indexzero/http-server
[local-app-url]: http://localhost:3000
[local-app-prod-url]: http://localhost:3000
[node]: https://nodejs.org/
[yarn]: https://classic.yarnpkg.com/lang/en/
[circleci]: https://circleci.com/
